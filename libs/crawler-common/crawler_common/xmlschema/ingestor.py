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
        if object_key.lower().endswith(".tar.gz") or object_key.lower().endswith(
            ".tgz"
        ):
            suffix = ".tar.gz"
        elif object_key.lower().endswith(".xml.gz") or object_key.lower().endswith(
            ".gz"
        ):
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

    if path_str.endswith((".tar.gz", ".tgz", ".tar")):
        import io
        import tarfile

        mode = "r:gz" if path_str.endswith((".tar.gz", ".tgz")) else "r"
        with tarfile.open(path, mode) as tar:
            xml_members = [
                m
                for m in tar.getmembers()
                if m.isfile() and m.name.lower().endswith(".xml")
            ]
            target_member = (
                xml_members[0]
                if xml_members
                else next((m for m in tar.getmembers() if m.isfile()), None)
            )
            if target_member is None:
                raise ValueError(f"No valid XML files found in tar archive: {path}")

            extracted = tar.extractfile(target_member)
            if extracted is None:
                raise ValueError(f"Failed extracting {target_member.name} from {path}")

            with io.TextIOWrapper(extracted, encoding="utf-8") as xml_file:
                yield xml_file
        return

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


class _BufferedRow:
    __slots__ = ("table_name", "definition", "parent_row", "values", "row_id")

    def __init__(
        self,
        definition: TableSpec,
        parent_row: _BufferedRow | None,
        values: dict[str, Any],
    ) -> None:
        self.table_name = definition.table_name
        self.definition = definition
        self.parent_row = parent_row
        self.values = values
        self.row_id: int | None = None


def _compute_table_levels(schema_plan: SchemaPlan) -> list[list[str]]:
    levels: list[list[str]] = []
    assigned: set[str] = set()
    current_level = [t.table_name for t in schema_plan.root_tables.values()]
    while current_level:
        levels.append(current_level)
        assigned.update(current_level)
        next_level = []
        for t_spec in schema_plan.tables_by_name.values():
            if (
                t_spec.table_name not in assigned
                and t_spec.parent_table_name in assigned
            ):
                next_level.append(t_spec.table_name)
        current_level = next_level

    remaining = [
        t.table_name
        for t in schema_plan.tables_by_name.values()
        if t.table_name not in assigned
    ]
    if remaining:
        levels.append(remaining)

    return levels


def _flush_batch(
    session: Session,
    tables: dict[str, Table],
    table_levels: list[list[str]],
    pending_rows: list[_BufferedRow],
    inserted_counts: dict[str, int],
    chunk_size: int = 5000,
) -> None:
    if not pending_rows:
        return

    # Ensure all ancestor rows with row_id=None are included
    all_rows: list[_BufferedRow] = []
    seen: set[_BufferedRow] = set()

    def _add(r: _BufferedRow) -> None:
        if r in seen or r.row_id is not None:
            return
        if r.parent_row is not None and r.parent_row.row_id is None:
            _add(r.parent_row)
        seen.add(r)
        all_rows.append(r)

    for r in pending_rows:
        _add(r)

    rows_by_table: dict[str, list[_BufferedRow]] = defaultdict(list)
    for r in all_rows:
        rows_by_table[r.table_name].append(r)

    for level_tables in table_levels:
        for table_name in level_tables:
            table_rows = rows_by_table.get(table_name)
            if not table_rows:
                continue

            table = tables[table_name]
            parent_table_name = table_rows[0].definition.parent_table_name
            parent_col_name: str | None = None
            if parent_table_name:
                parent_col_name = _shorten_identifier(
                    f"{_sanitize_identifier(parent_table_name)}_id"
                )

            for i in range(0, len(table_rows), chunk_size):
                chunk = table_rows[i : i + chunk_size]

                # Union of all keys present across this chunk
                chunk_keys: set[str] = set()
                for r in chunk:
                    chunk_keys.update(r.values.keys())
                if parent_col_name is not None:
                    chunk_keys.add(parent_col_name)

                batch_values: list[dict[str, Any]] = []
                for r in chunk:
                    if parent_col_name is not None and r.parent_row is not None:
                        r.values[parent_col_name] = r.parent_row.row_id
                    row_dict = {k: r.values.get(k, None) for k in chunk_keys}
                    batch_values.append(row_dict)

                stmt = insert(table).returning(
                    table.c.id, sort_by_parameter_order=True
                )
                returned_ids = session.scalars(stmt, batch_values).all()

                for r, rid in zip(chunk, returned_ids):
                    r.row_id = rid

                inserted_counts[table_name] += len(chunk)


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

    tables: dict[str, Table] = {}
    for t_key, t_obj in metadata.tables.items():
        tables[t_obj.name] = t_obj
        tables[t_key] = t_obj

    table_levels = _compute_table_levels(schema_plan)
    inserted_counts: dict[str, int] = {
        table_name: 0
        for table_name in schema_plan.tables_by_name
        if not table_name.startswith("_")
    }
    frame_stack: list[_Frame] = []
    pending_batch_rows: list[_BufferedRow] = []
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
                    stmt = (
                        select(table.c._xml_hash)
                        .where(table.c._xml_hash == node_hash)
                        .limit(1)
                    )
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

    def _get_top_level_frame(frame: _Frame) -> _Frame:
        curr = frame
        while (
            curr.parent is not None
            and curr.parent.parent is not None
        ):
            curr = curr.parent
        return curr

    def _get_parent_buffered_row(f: _Frame) -> _BufferedRow | None:
        curr = f.parent
        while curr is not None:
            if curr.buffered_row is not None:
                return curr.buffered_row
            curr = curr.parent
        return None

    def _ensure_buffered_row(frame: _Frame) -> _BufferedRow | None:
        if frame.definition is None:
            return None
        if frame.buffered_row is not None:
            return frame.buffered_row

        parent_row = _get_parent_buffered_row(frame)
        b_row = _BufferedRow(frame.definition, parent_row, dict(frame.pending_values))
        frame.buffered_row = b_row
        top_frame = _get_top_level_frame(frame)
        top_frame.buffered_rows.append(b_row)
        return b_row

    def _sync_frame_values(frame: _Frame) -> None:
        if frame.definition is None or frame.buffered_row is None:
            return
        for column_spec in frame.definition.columns:
            if column_spec.source == "text":
                if frame.text_value is not None:
                    frame.buffered_row.values[column_spec.column_name] = _coerce_value(
                        frame.text_value, column_spec.sql_type
                    )
                continue
            if column_spec.column_name in frame.pending_values:
                frame.buffered_row.values[column_spec.column_name] = _coerce_value(
                    frame.pending_values[column_spec.column_name],
                    column_spec.sql_type,
                )

    def populate_attributes(frame: _Frame, attributes: dict[str, str]) -> None:
        if frame.definition is None:
            return

        for column_spec in frame.definition.columns:
            if column_spec.source != "attribute":
                continue
            if column_spec.xml_name in attributes:
                frame.pending_values[column_spec.column_name] = attributes[
                    column_spec.xml_name
                ]

    def current_parent() -> _Frame | None:
        return frame_stack[-1] if frame_stack else None

    root_element: Any = None

    with _iterable_xml_source(xml_source) as xml_file:
        for event, element in ET.iterparse(xml_file, events=("start", "end")):
            local_name = _local_name(element.tag)

            if event == "start":
                if root_element is None:
                    root_element = element

                if not frame_stack:
                    root_spec = schema_plan.root_tables.get(local_name)
                    if root_spec is None:
                        f = _Frame(definition=None, parent=None, element=element)
                        if deduplicate_by_hash:
                            _init_frame_hash(f, element, local_name)
                        frame_stack.append(f)
                        continue

                    root_frame = _Frame(
                        definition=root_spec, parent=None, element=element
                    )
                    if deduplicate_by_hash:
                        _init_frame_hash(root_frame, element, local_name)
                    populate_attributes(root_frame, element.attrib)
                    _ensure_buffered_row(root_frame)
                    frame_stack.append(root_frame)
                    continue

                parent_frame = current_parent()
                if parent_frame is None or parent_frame.definition is None:
                    f = _Frame(definition=None, parent=parent_frame, element=element)
                    if deduplicate_by_hash:
                        _init_frame_hash(f, element, local_name)
                    frame_stack.append(f)
                    continue

                child_spec = parent_frame.definition.child_tables.get(local_name)
                if child_spec is not None:
                    child_frame = _Frame(
                        definition=child_spec, parent=parent_frame, element=element
                    )
                    if deduplicate_by_hash:
                        _init_frame_hash(child_frame, element, local_name)
                    populate_attributes(child_frame, element.attrib)
                    _ensure_buffered_row(child_frame)
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
                    if deduplicate_by_hash:
                        _init_frame_hash(f, element, local_name)
                    frame_stack.append(f)
                    continue

                f = _Frame(definition=None, parent=parent_frame, element=element)
                if deduplicate_by_hash:
                    _init_frame_hash(f, element, local_name)
                frame_stack.append(f)
                continue

            frame = frame_stack.pop()
            text_value = _clean_text(element.text)
            frame.text_value = text_value

            if deduplicate_by_hash:
                if text_value is not None:
                    frame.hash_tokens.append(f"text:{text_value}")
                frame.hash_tokens.append(f"</{local_name}>")

                if frame.parent is not None and frame.parent.definition is not None:
                    frame.parent.hash_tokens.extend(frame.hash_tokens)

            if frame.definition is None or frame.skipped:
                if (
                    frame.simple_column_name is not None
                    and frame.parent is not None
                    and not frame.parent.skipped
                ):
                    if text_value is not None:
                        frame.parent.pending_values[frame.simple_column_name] = (
                            text_value
                        )
                        _sync_frame_values(frame.parent)
                element.clear()
                continue

            _sync_frame_values(frame)

            if (
                frame.definition is not None
                and frame.buffered_row is not None
                and frame.buffered_row.row_id is not None
            ):
                table = tables[frame.definition.table_name]
                values = {
                    col.column_name: frame.buffered_row.values[col.column_name]
                    for col in frame.definition.columns
                    if col.column_name in frame.buffered_row.values
                }
                if values:
                    session.execute(
                        update(table)
                        .where(table.c.id == frame.buffered_row.row_id)
                        .values(**values)
                    )

            is_top_level_record = (
                (frame.parent is not None and len(frame_stack) == 1)
                or (frame.parent is None and completed_top_level_frames == 0)
            )

            if is_top_level_record:
                top_frame = _get_top_level_frame(frame)
                if deduplicate_by_hash:
                    try:
                        raw_bytes = "|".join(frame.hash_tokens).encode("utf-8")
                        node_hash = sha1(raw_bytes).hexdigest()
                        is_dup = _is_hash_duplicate(frame, node_hash)
                        if is_dup:
                            frame.skipped = True
                            top_frame.buffered_rows.clear()
                            if root_element is not None:
                                root_element.clear()
                            element.clear()
                            continue
                        if frame.buffered_row is not None:
                            frame.buffered_row.values["_xml_hash"] = node_hash
                        seen_hashes.add(node_hash)
                        if len(seen_hashes) > 100000:
                            seen_hashes.clear()
                    except Exception as exc:
                        logger.debug("Failed computing node hash: %s", exc)

                pending_batch_rows.extend(top_frame.buffered_rows)
                top_frame.buffered_rows.clear()

                completed_top_level_frames += 1
                if commit_every > 0 and completed_top_level_frames % commit_every == 0:
                    for f in frame_stack:
                        _sync_frame_values(f)
                    _flush_batch(
                        session,
                        tables,
                        table_levels,
                        pending_batch_rows,
                        inserted_counts,
                    )
                    pending_batch_rows.clear()
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

                if root_element is not None and len(frame_stack) > 0:
                    root_element.clear()
                if deduplicate_by_hash:
                    frame.hash_tokens.clear()

            element.clear()

    if pending_batch_rows:
        for f in frame_stack:
            _sync_frame_values(f)
        _flush_batch(
            session, tables, table_levels, pending_batch_rows, inserted_counts
        )
        pending_batch_rows.clear()

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

    valid_extensions = (".xml", ".xml.gz", ".gz", ".zip", ".tar.gz", ".tgz", ".tar")
    s3_objects = [
        obj
        for obj in contents
        if obj.get("Key")
        and any(obj["Key"].lower().endswith(ext) for ext in valid_extensions)
    ]

    if not s3_objects:
        logger.info("No XML/compressed objects found in S3 prefix %s", s3_uri)
        return {}

    ingested_files_table = metadata.tables.get(
        f"{INGEST_METADATA_SCHEMA}._ingested_files"
    )
    if ingested_files_table is None:
        ingested_files_table = metadata.tables.get("_ingested_files")
    already_processed: set[str] = set()
    if ingested_files_table is not None:
        try:
            stmt = select(
                ingested_files_table.c.file_key, ingested_files_table.c.file_etag
            )
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
        logger.info(
            "Ingesting new S3 file (%d/%d): %s",
            new_files_count,
            len(s3_objects),
            file_uri,
        )

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
                logger.warning(
                    "Failed recording file %s in _ingested_files: %s", key, exc
                )

    if new_files_count == 0:
        logger.info("No new XML files found to process in S3 prefix %s", s3_uri)

    return dict(total_counts)
