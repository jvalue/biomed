import logging
import os
import sys
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import urlopen

from dotenv import load_dotenv
from crawler_common.queue import consume_download_urls
from crawler_common.s3.client import create_s3_client


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
    download_chunk_size_bytes = int(
        os.getenv("DOWNLOAD_CHUNK_SIZE_BYTES", str(8 * 1024 * 1024))
    )
    s3_endpoint_url = os.getenv("S3_ENDPOINT_URL", "http://localhost:9000")
    s3_bucket = os.getenv("S3_BUCKET", "biomed-data")
    s3_debug_prefix = os.getenv("S3_DEBUG_PREFIX", "downloader-debug")
    s3_upload_prefix = os.getenv("S3_UPLOAD_PREFIX", "downloader-files")

    s3_client = create_s3_client(
        endpoint_url=s3_endpoint_url,
        timeout_seconds=timeout_seconds,
    )

    def upload_file_to_s3(download_url: str, source_file: Path) -> None:
        try:
            parsed = urlparse(download_url)
            source_path = parsed.path.lstrip("/") or "unknown-file"
            object_key = f"{s3_upload_prefix}/{source_path}"
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
        except Exception as e:
            logger.error(f"Failed to upload {source_file} to S3: {e}")
            raise

    def upload_dummy_marker(download_url: str, file_size_bytes: int) -> None:
        try:
            parsed = urlparse(download_url)
            source_path = parsed.path.lstrip("/") or "unknown-file"
            object_key = f"{s3_debug_prefix}/{source_path}.txt"
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

    def handle_download_url(download_url: str) -> None:
        try:
            parsed = urlparse(download_url)
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
                    upload_dummy_marker(download_url, file_size_bytes)
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
                            upload_dummy_marker(download_url, downloaded_bytes)
                            return

                        destination_file.write(chunk)

            logger.info(f"Download completed: {downloaded_bytes} bytes saved to {destination}")
            upload_file_to_s3(download_url, destination)
            logger.info(f"Successfully processed: {download_url}")
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
        
        if debug_large_file_mode:
            logger.warning(
                f"DEBUG MODE: Large files over {debug_large_file_threshold_mb}MB "
                f"will be skipped and dummy markers uploaded instead"
            )
        
        logger.info(f"Consuming messages from queue '{rabbitmq_queue}' from {rabbitmq_url}")
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
