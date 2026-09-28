"""Streaming XML database ingestion and S3 prefix processing."""

from __future__ import annotations

import datetime
import logging
import os
import time
from collections import defaultdict
from collections.abc import Iterator
from contextlib import contextmanager
from hashlib import sha1
from io import StringIO
from pathlib import Path
from typing import Any, TextIO

from sqlalchemy import (
    BigInteger,
    Boolean,
    Date,
    DateTime,
    Float,
    Integer,
    MetaData,
    Numeric,
    Table,
    insert,
    select,
    update,
)
from sqlalchemy.orm import Session

try:
    from lxml import etree as ET  # type: ignore
except ImportError:
    import xml.etree.ElementTree as ET  # type: ignore

from crawler_common.xmlschema.models import (
    DEFAULT_COMMIT_EVERY,
    DEFAULT_PROGRESS_LOG_EVERY,
    DEFAULT_PROGRESS_LOG_SECONDS,
    INGEST_METADATA_SCHEMA,
    SchemaPlan,
    TableSpec,
    _Frame,
    _local_name,
    _sanitize_identifier,
    _shorten_identifier,
)

logger = logging.getLogger(__name__)


def _clean_text(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned if cleaned else None


def _coerce_value(value: Any, sql_type: Any) -> Any:
    if value is None or not isinstance(value, str):
        return value

    cleaned = value.strip()
    if not cleaned:
        return None

    if isinstance(sql_type, Date):
        try:
            date_str = cleaned.rstrip("Z").split("T")[0]
            return datetime.date.fromisoformat(date_str)
        except Exception:
            return cleaned

    if isinstance(sql_type, DateTime):
        try:
            dt_str = cleaned.replace("Z", "+00:00")
            return datetime.datetime.fromisoformat(dt_str)
        except Exception:
            return cleaned

    if isinstance(sql_type, (Integer, BigInteger)):
        try:
            return int(cleaned)
        except Exception:
            return cleaned

    if isinstance(sql_type, (Float, Numeric)):
        try:
            return float(cleaned)
        except Exception:
            return cleaned

    if isinstance(sql_type, Boolean):
        lower = cleaned.lower()
        if lower in {"true", "1", "yes"}:
            return True
        if lower in {"false", "0", "no"}:
            return False
        return cleaned

    return value


@contextmanager
def _iterable_xml_source(source: str | Path | TextIO) -> Iterator[TextIO]:
    if hasattr(source, "read"):
        yield source  # type: ignore[misc]
        return

    if isinstance(source, str) and source.lstrip().startswith("<"):
        yield StringIO(source)
        return

    source_str = str(source)
    if source_str.startswith("s3://"):
        import tempfile
        from urllib.parse import urlparse

        from crawler_common.s3.client import create_s3_client

        parsed_s3 = urlparse(source_str)
        bucket_name = parsed_s3.netloc
        object_key = parsed_s3.path.lstrip("/")

        endpoint_url = os.getenv("S3_ENDPOINT_URL") or "http://minio:9000"
        s3_client = create_s3_client(endpoint_url=endpoint_url, timeout_seconds=60)

        suffix = Path(object_key).suffix or ".xml"
        if object_key.lower().endswith(".tar.gz") or object_key.lower().endswith(".xml.gz"):
            suffix = ".gz"
        elif object_key.lower().endswith(".zip"):
            suffix = ".zip"

        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp_file:
            tmp_path = Path(tmp_file.name)

        try:
            s3_client.download_file(bucket_name, object_key, str(tmp_path))
            with _iterable_xml_source(tmp_path) as xml_file:
                yield xml_file
        finally:
            if tmp_path.exists():
                tmp_path.unlink()
        return

    path = Path(source)
    path_str = str(path).lower()

    if path_str.endswith(".gz"):
        import gzip

        with gzip.open(path, "rt", encoding="utf-8") as xml_file:
            yield xml_file
        return

    if path_str.endswith(".zip"):
        import io
        import zipfile

        with zipfile.ZipFile(path, "r") as z:
            xml_names = [name for name in z.namelist() if name.lower().endswith(".xml")]
            target_name = xml_names[0] if xml_names else z.namelist()[0]
            with (
                z.open(target_name, "r") as binary_stream,
                io.TextIOWrapper(binary_stream, encoding="utf-8") as xml_file,
            ):
                yield xml_file
        return

    with path.open("r", encoding="utf-8") as xml_file:
        yield xml_file


def stream_xml_to_database(
    session: Session,
    xml_source: str | Path | TextIO,
    schema_plan: SchemaPlan,
    metadata: MetaData | None = None,
    progress_log_every: int = DEFAULT_PROGRESS_LOG_EVERY,
    progress_log_seconds: float = DEFAULT_PROGRESS_LOG_SECONDS,
    commit_every: int = DEFAULT_COMMIT_EVERY,
    deduplicate_by_hash: bool = False,
) -> dict[str, int]:
    """Stream XML records into the generated SQLAlchemy schema."""
    from crawler_common.xmlschema.schema import build_sqlalchemy_metadata

    if metadata is None:
        metadata = build_sqlalchemy_metadata(schema_plan)

    tables = metadata.tables
    inserted_counts: dict[str, int] = {
        table_name: 0 for table_name in tables if not table_name.startswith("_")
    }
    frame_stack: list[_Frame] = []
    completed_top_level_frames = 0
    started_at = time.monotonic()
    last_progress_log_at = started_at

    seen_hashes: set[str] = set()

    logger.info("Starting XML stream ingest")

    def get_table(frame: TableSpec) -> Table:
        return tables[frame.table_name]

    def _is_hash_duplicate(frame: _Frame, node_hash: str) -> bool:
        if node_hash in seen_hashes:
            return True

        if frame.definition is not None:
            table = get_table(frame.definition)
            if "_xml_hash" in table.c:
                try:
                    stmt = select(table.c._xml_hash).where(table.c._xml_hash == node_hash).limit(1)
                    if session.execute(stmt).first() is not None:
                        seen_hashes.add(node_hash)
                        if len(seen_hashes) > 100000:
                            seen_hashes.clear()
                        return True
                except Exception as exc:
                    logger.debug("Database hash check failed: %s", exc)

        return False

    def _init_frame_hash(f: _Frame, elem: ET.Element, tag: str) -> None:
        f.hash_tokens.append(f"<{tag}>")
        if elem.attrib:
            for k in sorted(elem.attrib):
                f.hash_tokens.append(f"attr:{k}={elem.attrib[k]}")

    def ensure_inserted(frame: _Frame) -> int | None:
        if frame.definition is None or frame.skipped:
            return None
        if frame.row_id is not None:
            return frame.row_id

        if frame.parent is not None and frame.parent.skipped:
            frame.skipped = True
            return None

        parent_id: int | None = None
        if frame.parent is not None and frame.parent.definition is not None:
            parent_id = ensure_inserted(frame.parent)
            if frame.parent.skipped:
                frame.skipped = True
                return None

        if (
            deduplicate_by_hash
            and frame.parent is not None
            and (frame.parent.definition is None or frame.parent.parent is None)
        ):
            try:
                raw_bytes = "|".join(frame.hash_tokens).encode("utf-8")
                node_hash = sha1(raw_bytes).hexdigest()
                if _is_hash_duplicate(frame, node_hash):
                    frame.skipped = True
                    return None
                frame.pending_values["_xml_hash"] = node_hash
            except Exception as exc:
                logger.debug("Failed computing node hash: %s", exc)

        table = get_table(frame.definition)
        values: dict[str, Any] = {}
        if parent_id is not None and frame.definition.parent_table_name:
            parent_column_name = _shorten_identifier(
                f"{_sanitize_identifier(frame.definition.parent_table_name)}_id"
            )
            values[parent_column_name] = parent_id

        for column_spec in frame.definition.columns:
            if column_spec.source == "text":
                if frame.text_value is not None:
                    values[column_spec.column_name] = _coerce_value(
                        frame.text_value, column_spec.sql_type
                    )
                continue
            if column_spec.column_name in frame.pending_values:
                values[column_spec.column_name] = _coerce_value(
                    frame.pending_values[column_spec.column_name], column_spec.sql_type
                )

        if "_xml_hash" in frame.pending_values:
            values["_xml_hash"] = frame.pending_values["_xml_hash"]

        result = session.execute(insert(table).values(**values))
        row_id = result.inserted_primary_key[0]
        frame.row_id = int(row_id)
        inserted_counts[frame.definition.table_name] += 1
        if values.get("_xml_hash"):
            seen_hashes.add(values["_xml_hash"])
            if len(seen_hashes) > 100000:
                seen_hashes.clear()
        return int(row_id)

    def populate_attributes(frame: _Frame, attributes: dict[str, str]) -> None:
        if frame.definition is None:
            return

        for column_spec in frame.definition.columns:
            if column_spec.source != "attribute":
                continue
            if column_spec.xml_name in attributes:
                frame.pending_values[column_spec.column_name] = attributes[column_spec.xml_name]

    def update_row(frame: _Frame) -> None:
        if frame.definition is None or frame.row_id is None:
            return

        table = get_table(frame.definition)
        values: dict[str, Any] = {}
        for column_spec in frame.definition.columns:
            if column_spec.source == "text":
                if frame.text_value is not None:
                    values[column_spec.column_name] = _coerce_value(
                        frame.text_value, column_spec.sql_type
                    )
                continue
            if column_spec.column_name in frame.pending_values:
                values[column_spec.column_name] = _coerce_value(
                    frame.pending_values[column_spec.column_name], column_spec.sql_type
                )

        if values:
            session.execute(update(table).where(table.c.id == frame.row_id).values(**values))

    def commit_completed_top_level_frame(frame: _Frame) -> None:
        nonlocal completed_top_level_frames, last_progress_log_at

        if frame.parent is not None and len(frame_stack) == 1:
            completed_top_level_frames += 1
            if commit_every > 0 and completed_top_level_frames % commit_every == 0:
                session.commit()

            now = time.monotonic()
            should_log_progress = (
                completed_top_level_frames % max(1, progress_log_every) == 0
                or now - last_progress_log_at >= progress_log_seconds
            )
            if should_log_progress:
                elapsed_seconds = now - started_at
                total_rows = sum(inserted_counts.values())
                logger.info(
                    "XML ingest progress: %s top-level records committed, %s rows inserted in %.1fs",
                    completed_top_level_frames,
                    total_rows,
                    elapsed_seconds,
                )
                last_progress_log_at = now

    def current_parent() -> _Frame | None:
        return frame_stack[-1] if frame_stack else None

    with _iterable_xml_source(xml_source) as xml_file:
        for event, element in ET.iterparse(xml_file, events=("start", "end")):
            local_name = _local_name(element.tag)

            if event == "start":
                if not frame_stack:
                    root_spec = schema_plan.root_tables.get(local_name)
                    if root_spec is None:
                        f = _Frame(definition=None, parent=None, element=element)
                        _init_frame_hash(f, element, local_name)
                        frame_stack.append(f)
                        continue

                    root_frame = _Frame(definition=root_spec, parent=None, element=element)
                    _init_frame_hash(root_frame, element, local_name)
                    populate_attributes(root_frame, element.attrib)
                    frame_stack.append(root_frame)
                    continue

                parent_frame = current_parent()
                if parent_frame is None or parent_frame.definition is None:
                    f = _Frame(definition=None, parent=parent_frame, element=element)
                    _init_frame_hash(f, element, local_name)
                    frame_stack.append(f)
                    continue

                child_spec = parent_frame.definition.child_tables.get(local_name)
                if child_spec is not None:
                    child_frame = _Frame(definition=child_spec, parent=parent_frame, element=element)
                    _init_frame_hash(child_frame, element, local_name)
                    populate_attributes(child_frame, element.attrib)
                    frame_stack.append(child_frame)
                    continue

                simple_column = parent_frame.definition.simple_children.get(local_name)
                if simple_column is not None:
                    f = _Frame(
                        definition=None,
                        parent=parent_frame,
                        simple_column_name=simple_column.column_name,
                        element=element,
                    )
                    _init_frame_hash(f, element, local_name)
                    frame_stack.append(f)
                    continue

                f = _Frame(definition=None, parent=parent_frame, element=element)
                _init_frame_hash(f, element, local_name)
                frame_stack.append(f)
                continue

            frame = frame_stack.pop()
            text_value = _clean_text(element.text)

            if text_value is not None:
                frame.hash_tokens.append(f"text:{text_value}")
            frame.hash_tokens.append(f"</{local_name}>")

            if frame.parent is not None:
                frame.parent.hash_tokens.extend(frame.hash_tokens)

            if frame.definition is None or frame.skipped:
                if frame.simple_column_name is not None and frame.parent is not None and not frame.parent.skipped:
                    if text_value is not None:
                        frame.parent.pending_values[frame.simple_column_name] = text_value
                    commit_completed_top_level_frame(frame)
                element.clear()
                continue

            frame.text_value = text_value
            if frame.row_id is None:
                ensure_inserted(frame)
            else:
                update_row(frame)
            commit_completed_top_level_frame(frame)
            element.clear()

    session.flush()
    session.commit()
    elapsed_seconds = time.monotonic() - started_at
    logger.info(
        "Completed XML stream ingest: %s top-level records committed, %s rows inserted in %.1fs",
        completed_top_level_frames,
        sum(inserted_counts.values()),
        elapsed_seconds,
    )
    return inserted_counts


def process_s3_prefix_ingestion(
    session: Session,
    s3_uri: str,
    schema_plan: SchemaPlan,
    metadata: MetaData,
    commit_every: int = DEFAULT_COMMIT_EVERY,
    deduplicate_by_hash: bool = True,
) -> dict[str, int]:
    """Scan S3 prefix for new/unprocessed XML files and ingest them."""
    from urllib.parse import urlparse

    from crawler_common.s3.client import create_s3_client

    parsed_s3 = urlparse(s3_uri)
    bucket_name = parsed_s3.netloc
    prefix = parsed_s3.path.lstrip("/")

    endpoint_url = os.getenv("S3_ENDPOINT_URL") or "http://minio:9000"
    s3_client = create_s3_client(endpoint_url=endpoint_url, timeout_seconds=60)

    try:
        response = s3_client.list_objects_v2(Bucket=bucket_name, Prefix=prefix)
    except Exception as exc:
        logger.warning("Failed listing S3 prefix %s: %s", s3_uri, exc)
        return {}

    contents = response.get("Contents", [])
    if not contents:
        logger.info("No S3 objects found in %s", s3_uri)
        return {}

    valid_extensions = (".xml", ".xml.gz", ".gz", ".zip")
    s3_objects = [
        obj
        for obj in contents
        if obj.get("Key") and any(obj["Key"].lower().endswith(ext) for ext in valid_extensions)
    ]

    if not s3_objects:
        logger.info("No XML/compressed objects found in S3 prefix %s", s3_uri)
        return {}

    ingested_files_table = metadata.tables.get(f"{INGEST_METADATA_SCHEMA}._ingested_files")
    if ingested_files_table is None:
        ingested_files_table = metadata.tables.get("_ingested_files")
    already_processed: set[str] = set()
    if ingested_files_table is not None:
        try:
            stmt = select(ingested_files_table.c.file_key, ingested_files_table.c.file_etag)
            rows = session.execute(stmt).all()
            for r in rows:
                if r[0]:
                    already_processed.add(f"{r[0]}::{r[1] or ''}")
        except Exception as exc:
            logger.debug("Could not read _ingested_files table: %s", exc)

    total_counts: dict[str, int] = defaultdict(int)
    new_files_count = 0

    for obj in s3_objects:
        key = obj["Key"]
        etag = str(obj.get("ETag", "")).strip('"')
        file_size = obj.get("Size", 0)

        lookup_key = f"{key}::{etag}"
        if lookup_key in already_processed:
            logger.debug("Skipping already processed S3 file: %s (etag=%s)", key, etag)
            continue

        new_files_count += 1
        file_uri = f"s3://{bucket_name}/{key}"
        logger.info("Ingesting new S3 file (%d/%d): %s", new_files_count, len(s3_objects), file_uri)

        file_counts = stream_xml_to_database(
            session,
            file_uri,
            schema_plan,
            metadata,
            commit_every=commit_every,
            deduplicate_by_hash=deduplicate_by_hash,
        )

        for tbl, count in file_counts.items():
            total_counts[tbl] += count

        if ingested_files_table is not None:
            try:
                session.execute(
                    insert(ingested_files_table).values(
                        file_key=key,
                        file_etag=etag,
                        file_size=file_size,
                        ingested_at=datetime.datetime.now(datetime.timezone.utc),
                    )
                )
                session.commit()
                already_processed.add(lookup_key)
            except Exception as exc:
                logger.warning("Failed recording file %s in _ingested_files: %s", key, exc)

    if new_files_count == 0:
        logger.info("No new XML files found to process in S3 prefix %s", s3_uri)

    return dict(total_counts)
