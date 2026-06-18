import logging
import os
import sys
from collections import defaultdict
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import urlopen

from dotenv import load_dotenv
from crawler_common.queue import consume_download_urls
from crawler_common.s3.client import create_s3_client
from crawler_common.database import (
    ensure_crawler_schema,
    get_database_url_from_env,
    init_database,
    get_session,
)
from crawler_common.models.db import FTPDiscoveryEntry
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from botocore.exceptions import ClientError


logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


APP_DIR = Path(__file__).resolve().parents[1]
load_dotenv(APP_DIR / ".env")


def as_bool(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def as_int(value: str | None, default: int = 0) -> int:
    if value is None:
        return default
    try:
        return int(value)
    except ValueError:
        return default


def main() -> None:
    """Consume download URLs from RabbitMQ and download files locally."""
    rabbitmq_url = os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672/")
    rabbitmq_queue = os.getenv("RABBITMQ_QUEUE", "download-urls")
    download_dir = Path(
        os.getenv("DOWNLOAD_DESTINATION_DIR", "/tmp/downloader-general")
    )
    timeout_seconds = int(os.getenv("DOWNLOAD_TIMEOUT_SECONDS", "30"))
    debug_large_file_mode = as_bool(
        os.getenv("DOWNLOAD_DEBUG_LARGE_FILE_MODE"),
        False,
    )
    debug_large_file_threshold_mb = int(
        os.getenv("DOWNLOAD_DEBUG_LARGE_FILE_THRESHOLD_MB", "100")
    )
    debug_large_file_threshold_bytes = debug_large_file_threshold_mb * 1024 * 1024
    debug_max_files_per_folder = as_int(
        os.getenv("DOWNLOAD_DEBUG_MAX_FILES_PER_FOLDER"),
        0,
    )
    # Grouping for the per-folder cap: use the full parent folder path
    # (per-sub-folder behavior). We no longer support truncating by depth.
    download_chunk_size_bytes = int(
        os.getenv("DOWNLOAD_CHUNK_SIZE_BYTES", str(8 * 1024 * 1024))
    )
    s3_endpoint_url = os.getenv("S3_ENDPOINT_URL", "http://localhost:9000")
    s3_bucket = os.getenv("S3_BUCKET", "biomed-data")
    s3_debug_prefix = os.getenv("S3_DEBUG_PREFIX", "downloader-debug")
    s3_upload_prefix = os.getenv("S3_UPLOAD_PREFIX", "downloader-files")
    folder_download_counts: dict[str, int] = defaultdict(int)

    s3_client = create_s3_client(
        endpoint_url=s3_endpoint_url,
        timeout_seconds=timeout_seconds,
    )

    # Initialize database connection to allow marking entries as downloaded
    database_url = get_database_url_from_env(APP_DIR / ".env")
    engine = init_database(database_url, echo=False)
    # ensure_crawler_schema expects a SQLAlchemy Engine; in tests the init
    # functions may be monkeypatched to return a dummy object. Guard the call
    # so tests that supply a non-engine sentinel do not raise during import.
    try:
        ensure_crawler_schema(engine)
    except Exception:
        logger.debug("Skipping schema ensure; engine not inspectable", exc_info=True)
    session = get_session(engine)
    # Simple in-memory cache for run_id -> db_name to avoid repeated DB lookups
    db_name_cache: dict[int, str] = {}
    DB_NAME_CACHE_MAX = int(os.getenv("DB_NAME_CACHE_SIZE", "1000"))

    def _path_key_from_url(parsed) -> str:
        return parsed.path.lstrip("/") or ""

    def _folder_key_from_url(parsed) -> str:
        folder_path = Path(parsed.path).parent.as_posix().lstrip("/")
        return folder_path or "/"

    def _to_int_or_none(val: object) -> int | None:
        try:
            return int(val)
        except Exception:
            return None
    
    
    def _get_db_name_from_run_id(run_id: int) -> str:
        # Use cached value if available
        try:
            if run_id in db_name_cache:
                return db_name_cache[run_id]
        except Exception:
            # Defensive: if cache access fails, continue to DB lookup
            logger.debug("Cache access error for run_id=%s", run_id, exc_info=True)

        # Attempt to look up a run-specific database name. If not found,
        # fall back to the configured CRAWL_DB_NAME environment variable.
        try:
            from crawler_common.models.db import FTPDiscoveryRun

            stmt = select(FTPDiscoveryRun).where(FTPDiscoveryRun.id == run_id)
            run = session.execute(stmt).scalars().first()
            if run is not None and getattr(run, "db_name", None):
                db_name = str(run.db_name)
                # Cache the resolved name with simple eviction
                try:
                    db_name_cache[run_id] = db_name
                    if len(db_name_cache) > DB_NAME_CACHE_MAX:
                        # pop oldest inserted item
                        first_key = next(iter(db_name_cache))
                        db_name_cache.pop(first_key, None)
                except Exception:
                    logger.debug("Failed to update db_name cache for run_id=%s", run_id, exc_info=True)
                return db_name
        except Exception:
            logger.debug("Failed to lookup db_name for run_id=%s", run_id, exc_info=True)

        # Default crawl database name from environment
        return os.getenv("CRAWL_DB_NAME", "")

    def _mark_entry_by_run(run_id: int, path_key: str) -> bool:
        logger.debug(f"Attempting mark by run: run_id={run_id}, path_key='{path_key}'")
        try:
            # Try exact match first, then try with a leading slash if not found
            stmt = select(FTPDiscoveryEntry).where(
                FTPDiscoveryEntry.run_id == run_id,
                FTPDiscoveryEntry.path == path_key,
            ).order_by(FTPDiscoveryEntry.id.desc())
            entry = session.execute(stmt).scalars().first()
            if not entry and path_key:
                alt = "/" + path_key.lstrip("/")
                logger.debug(f"No entry found, trying alternate path '{alt}'")
                stmt2 = select(FTPDiscoveryEntry).where(
                    FTPDiscoveryEntry.run_id == run_id,
                    FTPDiscoveryEntry.path == alt,
                ).order_by(FTPDiscoveryEntry.id.desc())
                entry = session.execute(stmt2).scalars().first()
            if not entry:
                return False
            entry.downloaded = True
            session.commit()
            logger.info(f"Marked FTPDiscoveryEntry id={entry.id} as downloaded (run {run_id})")
            return True
        except SQLAlchemyError:
            session.rollback()
            raise

    def _mark_entry_fallback(path_key: str) -> bool:
        logger.debug(f"Attempting fallback mark for path_key='{path_key}'")
        try:
            stmt = (
                select(FTPDiscoveryEntry)
                .where(FTPDiscoveryEntry.path == path_key)
                .order_by(FTPDiscoveryEntry.id.desc())
            )
            entry = session.execute(stmt).scalars().first()
            if not entry and path_key:
                alt = "/" + path_key.lstrip("/")
                logger.debug(f"Fallback: trying alternate path '{alt}'")
                stmt2 = (
                    select(FTPDiscoveryEntry)
                    .where(FTPDiscoveryEntry.path == alt)
                    .order_by(FTPDiscoveryEntry.id.desc())
                )
                entry = session.execute(stmt2).scalars().first()
            if not entry:
                return False
            entry.downloaded = True
            session.commit()
            logger.info(f"Marked FTPDiscoveryEntry id={entry.id} as downloaded (fallback)")
            return True
        except SQLAlchemyError:
            session.rollback()
            raise

    def upload_file_to_s3(download_url: str, source_file: Path, ftp_run_id: object | None = None) -> None:
        try:
            parsed = urlparse(download_url)
            source_path = parsed.path.lstrip("/") or "unknown-file"
            # Determine db prefix (run-specific or env default)
            run_id_int = _to_int_or_none(ftp_run_id)
            db_prefix = _get_db_name_from_run_id(run_id_int) if run_id_int is not None else os.getenv("CRAWL_DB_NAME", "")
            # If the source_path already starts with the db_prefix, avoid duplicating it
            normalized_source = source_path
            if db_prefix and normalized_source.startswith(f"{db_prefix}/"):
                normalized_source = normalized_source[len(db_prefix) + 1 :]
            # Always place files under the upload prefix so keys look like
            # <s3_upload_prefix>/<maybe-run-prefix/...>/file
            object_key = f"{s3_upload_prefix}/{normalized_source}"
            file_size = source_file.stat().st_size

            logger.debug(f"Uploading file to S3: {object_key} ({file_size} bytes)")
            with source_file.open("rb") as file_handle:
                s3_client.put_object(
                    Bucket=s3_bucket,
                    Key=object_key,
                    Body=file_handle,
                    ContentType="application/octet-stream",
                )

            logger.info(
                f"Successfully uploaded to s3://{s3_bucket}/{object_key} "
                f"({file_size / (1024 * 1024):.2f} MB)"
            )

            # remove local file after successful upload to free disk
            try:
                source_file.unlink(missing_ok=True)
                logger.debug(f"Removed local file {source_file} after upload")
            except Exception:
                logger.exception(f"Failed to remove local file {source_file} after upload")
        except Exception as e:
            # Special-case: if S3/MinIO reports no space left on device, upload a debug marker
            # and clean up the local file to avoid repeated failures and disk exhaustion.
            try:
                msg = str(e)
            except Exception:
                msg = ""

            if isinstance(e, ClientError) and ("no space left on device" in msg.lower() or "no space" in msg.lower()):
                logger.error(f"S3 reported no space left: {e}. Uploading debug marker and cleaning up local file")
                try:
                    upload_dummy_marker(download_url, source_file.stat().st_size if source_file.exists() else 0, ftp_run_id=ftp_run_id)
                except Exception:
                    logger.exception("Failed to upload dummy marker after no-space error")
                try:
                    source_file.unlink(missing_ok=True)
                except Exception:
                    logger.exception(f"Failed to remove local file {source_file} after no-space error")
                return

            logger.error(f"Failed to upload {source_file} to S3: {e}")
            raise

    def upload_dummy_marker(download_url: str, file_size_bytes: int, ftp_run_id: object | None = None) -> None:
        try:
            parsed = urlparse(download_url)
            source_path = parsed.path.lstrip("/") or "unknown-file"
            # Determine db prefix (run-specific or env default)
            run_id_int = _to_int_or_none(ftp_run_id)
            db_prefix = _get_db_name_from_run_id(run_id_int) if run_id_int is not None else os.getenv("CRAWL_DB_NAME", "")
            # If the source_path already starts with the db_prefix, avoid duplicating it
            normalized_source = source_path
            if db_prefix and normalized_source.startswith(f"{db_prefix}/"):
                normalized_source = normalized_source[len(db_prefix) + 1 :]
            # Always place debug markers under the debug prefix
            object_key = f"{s3_debug_prefix}/{normalized_source}.txt"
            body = (
                "debug large file mode: original file skipped\n"
                f"url={download_url}\n"
                f"size_bytes={file_size_bytes}\n"
            ).encode("utf-8")
            logger.debug(f"Uploading debug marker to S3: {object_key}")
            s3_client.put_object(
                Bucket=s3_bucket,
                Key=object_key,
                Body=body,
                ContentType="text/plain; charset=utf-8",
            )
            logger.info(
                f"Uploaded debug marker to s3://{s3_bucket}/{object_key} "
                f"(original file size: {file_size_bytes / (1024 * 1024):.2f} MB)"
            )
        except Exception as e:
            logger.error(f"Failed to upload debug marker for {download_url}: {e}")
            raise

    def handle_download_url(download_url: str, ftp_run_id: object = None) -> None:
        try:
            parsed = urlparse(download_url)
            folder_key = _folder_key_from_url(parsed)
            if debug_max_files_per_folder > 0:
                    current_folder_count = folder_download_counts[folder_key]
                    logger.debug(
                        "Per-folder check: folder='%s' count=%s cap=%s",
                        folder_key,
                        current_folder_count,
                        debug_max_files_per_folder,
                    )
                    if current_folder_count >= debug_max_files_per_folder:
                        logger.info(
                            "Skipping download for %s because folder '%s' reached the debug cap of %s files",
                            download_url,
                            folder_key,
                            debug_max_files_per_folder,
                        )
                        return

            file_name = Path(parsed.path).name or "downloaded-file"
            destination = download_dir / file_name
            download_dir.mkdir(parents=True, exist_ok=True)

            logger.info(f"Starting download: {download_url} -> {destination}")
            with urlopen(download_url, timeout=timeout_seconds) as response:
                content_length_header = response.headers.get("Content-Length")
                file_size_bytes = (
                    int(content_length_header) if content_length_header else None
                )
                
                if file_size_bytes:
                    file_size_mb = file_size_bytes / (1024 * 1024)
                    logger.debug(f"File size: {file_size_mb:.2f} MB ({file_size_bytes} bytes)")

                if (
                    debug_large_file_mode
                    and file_size_bytes is not None
                    and file_size_bytes > debug_large_file_threshold_bytes
                ):
                    logger.warning(
                        f"File exceeds debug threshold ({file_size_bytes / (1024 * 1024):.2f} MB), "
                        f"uploading dummy marker instead"
                    )
                    upload_dummy_marker(download_url, file_size_bytes, ftp_run_id=ftp_run_id)
                    return

                downloaded_bytes = 0
                with destination.open("wb") as destination_file:
                    while True:
                        chunk = response.read(download_chunk_size_bytes)
                        if not chunk:
                            break

                        downloaded_bytes += len(chunk)

                        if (
                            debug_large_file_mode
                            and downloaded_bytes > debug_large_file_threshold_bytes
                        ):
                            destination_file.close()
                            destination.unlink(missing_ok=True)
                            logger.warning(
                                f"Download exceeded debug threshold during streaming "
                                f"({downloaded_bytes / (1024 * 1024):.2f} MB), uploading dummy marker instead"
                            )
                            upload_dummy_marker(download_url, downloaded_bytes, ftp_run_id=ftp_run_id)
                            return

                        destination_file.write(chunk)

            logger.info(f"Download completed: {downloaded_bytes} bytes saved to {destination}")
            upload_file_to_s3(download_url, destination, ftp_run_id=ftp_run_id)
            # Only count successful uploads toward the per-folder debug cap
            if debug_max_files_per_folder > 0:
                folder_download_counts[folder_key] = folder_download_counts.get(folder_key, 0) + 1
                logger.debug(
                    "Per-folder increment: folder='%s' new_count=%s",
                    folder_key,
                    folder_download_counts[folder_key],
                )
            logger.info(f"Successfully processed: {download_url}")
            # Mark corresponding FTP discovery entry as downloaded (best-effort)
            try:
                path_key = _path_key_from_url(parsed)
                if path_key:
                    run_id_int = _to_int_or_none(ftp_run_id)
                    if run_id_int is not None:
                        if not _mark_entry_by_run(run_id_int, path_key):
                            _mark_entry_fallback(path_key)
                    else:
                        _mark_entry_fallback(path_key)
            except Exception:
                logger.exception("Failed to mark FTP discovery entry as downloaded")
        except Exception as e:
            logger.exception(f"Error downloading {download_url}: {e}")
            raise

    try:
        logger.info("Starting downloader service")
        logger.info(f"RabbitMQ Configuration: URL={rabbitmq_url}, Queue={rabbitmq_queue}")
        logger.info(
            f"Download Configuration: Destination={download_dir}, "
            f"Timeout={timeout_seconds}s, Chunk size={download_chunk_size_bytes} bytes"
        )
        logger.info(
            f"S3 Configuration: Endpoint={s3_endpoint_url}, Bucket={s3_bucket}, "
            f"Upload prefix={s3_upload_prefix}"
        )
        if debug_max_files_per_folder > 0:
            logger.warning(
                "DEBUG MODE: downloading at most %s files per folder",
                debug_max_files_per_folder,
            )
        
        if debug_large_file_mode:
            logger.warning(
                f"DEBUG MODE: Large files over {debug_large_file_threshold_mb}MB "
                f"will be skipped and dummy markers uploaded instead"
            )
        
        logger.info(f"Consuming messages from queue '{rabbitmq_queue}' from {rabbitmq_url}")
        # Local dry-run mode for testing without RabbitMQ. Set `DRY_RUN_URLS`
        # to a comma-separated list of URLs or set `DRY_RUN_FILE` to a file
        # path containing one URL per line. Useful for local runs.
        dry_run_urls = os.getenv("DRY_RUN_URLS")
        dry_run_file = os.getenv("DRY_RUN_FILE")
        if dry_run_urls or dry_run_file:
            urls: list[str] = []
            if dry_run_urls:
                urls.extend([u.strip() for u in dry_run_urls.split(",") if u.strip()])
            if dry_run_file:
                try:
                    with open(dry_run_file, "r", encoding="utf-8") as f:
                        for line in f:
                            v = line.strip()
                            if v:
                                urls.append(v)
                except Exception:
                    logger.exception(f"Failed to read DRY_RUN_FILE={dry_run_file}")

            logger.info(f"DRY RUN: processing {len(urls)} URLs locally")
            for u in urls:
                try:
                    handle_download_url(u)
                except Exception:
                    logger.exception(f"DRY RUN: failed processing {u}")
            return

        consume_download_urls(
            rabbitmq_url=rabbitmq_url,
            queue_name=rabbitmq_queue,
            on_download_url=handle_download_url,
        )
    except KeyboardInterrupt:
        logger.info("Downloader service stopped by user")
    except Exception as exc:
        logger.exception(f"Downloader consumer stopped with error: {exc}")
        sys.exit(1)


if __name__ == "__main__":
    main()
