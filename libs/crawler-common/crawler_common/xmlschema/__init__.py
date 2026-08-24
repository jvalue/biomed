"""Translate XSD schemas into relational tables and stream XML into them."""

from __future__ import annotations

from contextlib import contextmanager
from dataclasses import dataclass, field
from hashlib import sha1
from io import StringIO
from pathlib import Path
from typing import Any, Iterator, TextIO
import datetime
import re
import logging
import time
import xml.etree.ElementTree as ET


from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    MetaData,
    Numeric,
    Table,
    Text,
    insert,
    update,
)
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session

XSD_NAMESPACE = "http://www.w3.org/2001/XMLSchema"
POSTGRES_IDENTIFIER_LIMIT = 63
DEFAULT_PROGRESS_LOG_EVERY = 500
DEFAULT_PROGRESS_LOG_SECONDS = 5.0
DEFAULT_COMMIT_EVERY = 500

_IDENTIFIER_PATTERN = re.compile(r"[^0-9A-Za-z_]+")
_COLLAPSE_PATTERN = re.compile(r"_+")
logger = logging.getLogger(__name__)

try:
    from lxml import etree as ET  # type: ignore
except ImportError:
    import xml.etree.ElementTree as ET  # type: ignore


@dataclass(slots=True)
class ColumnSpec:
    """Describe one SQL column derived from an XSD attribute or element."""

    xml_name: str
    column_name: str
    sql_type: Any
    nullable: bool = True
    source: str = "child"


@dataclass(slots=True)
class TableSpec:
    """Describe one SQL table and how XML elements map into it."""

    xml_name: str
    table_name: str
    table_alias: str | None
    parent_table_name: str | None
    repeatable: bool = False
    columns: list[ColumnSpec] = field(default_factory=list)
    simple_children: dict[str, ColumnSpec] = field(default_factory=dict)
    child_tables: dict[str, "TableSpec"] = field(default_factory=dict)
    text_column: ColumnSpec | None = None


@dataclass(slots=True)
class SchemaPlan:
    """A parsed XSD schema ready to be materialized in Postgres."""

    root_tables: dict[str, TableSpec]
    tables_by_name: dict[str, TableSpec]


@dataclass(slots=True)
class _SchemaCatalog:
    root_elements: list[ET.Element]
    named_complex_types: dict[str, ET.Element]
    named_simple_types: dict[str, ET.Element]
    elements_by_name: dict[str, ET.Element]


@dataclass(slots=True)
class _Frame:
    definition: TableSpec | None
    parent: "_Frame | None"
    row_id: int | None = None
    pending_values: dict[str, Any] = field(default_factory=dict)
    text_value: str | None = None
    simple_column_name: str | None = None


_BUILTIN_TYPE_MAP: dict[str, Any] = {
    "string": Text(),
    "normalizedString": Text(),
    "token": Text(),
    "language": Text(),
    "Name": Text(),
    "NCName": Text(),
    "ID": Text(),
    "IDREF": Text(),
    "IDREFS": Text(),
    "ENTITY": Text(),
    "ENTITIES": Text(),
    "NMTOKEN": Text(),
    "NMTOKENS": Text(),
    "anyURI": Text(),
    "QName": Text(),
    "boolean": Boolean(),
    "byte": Integer(),
    "short": Integer(),
    "int": Integer(),
    "integer": BigInteger(),
    "nonPositiveInteger": BigInteger(),
    "negativeInteger": BigInteger(),
    "long": BigInteger(),
    "nonNegativeInteger": BigInteger(),
    "unsignedLong": BigInteger(),
    "positiveInteger": BigInteger(),
    "unsignedInt": BigInteger(),
    "unsignedShort": Integer(),
    "unsignedByte": Integer(),
    "decimal": Numeric(),
    "float": Float(),
    "double": Float(),
    "date": Date(),
    "dateTime": DateTime(timezone=True),
    "time": DateTime(timezone=True),
    "base64Binary": Text(),
    "hexBinary": Text(),
}


def _local_name(tag: str | None) -> str:
    if not tag:
        return ""
    return tag.rsplit("}", 1)[-1]


def _sanitize_identifier(value: str) -> str:
    cleaned = _IDENTIFIER_PATTERN.sub("_", value.strip())
    cleaned = _COLLAPSE_PATTERN.sub("_", cleaned).strip("_")
    if not cleaned:
        return "value"
    if cleaned[0].isdigit():
        return f"_{cleaned}"
    return cleaned.lower()


def _shorten_identifier(value: str, limit: int = POSTGRES_IDENTIFIER_LIMIT) -> str:
    if len(value) <= limit:
        return value

    digest = sha1(value.encode("utf-8")).hexdigest()[:8]
    trimmed_length = max(1, limit - len(digest) - 1)
    return f"{value[:trimmed_length]}_{digest}"


def _join_path(path_parts: list[str]) -> str:
    joined = "_".join(_sanitize_identifier(part) for part in path_parts if part)
    return _shorten_identifier(joined)


def _occurs_is_repeatable(element: ET.Element) -> bool:
    max_occurs = element.get("maxOccurs", "1")
    return max_occurs == "unbounded" or int(max_occurs) > 1


def _is_optional(element: ET.Element) -> bool:
    return element.get("minOccurs", "1") == "0"


def _column_type_for_xsd(type_name: str | None) -> Any:
    if not type_name:
        return Text()

    local_type = type_name.rsplit(":", 1)[-1]
    return _BUILTIN_TYPE_MAP.get(local_type, Text())


def _table_name_for_path(path_parts: list[str], table_prefix: str | None = None) -> str:
    name = _join_path(path_parts)
    if table_prefix:
        prefix = _sanitize_identifier(table_prefix)
        if prefix and not prefix.endswith("_"):
            prefix = f"{prefix}_"
        name = f"{prefix}{name}"
    return _shorten_identifier(name)


def _column_name_for_child(child_name: str) -> str:
    return _column_name_for_xml_field(child_name)


def _column_name_for_attribute(attribute_name: str) -> str:
    return _column_name_for_xml_field(attribute_name)


def _column_name_for_xml_field(field_name: str) -> str:
    candidate = _sanitize_identifier(field_name)
    if candidate == "id":
        candidate = f"{candidate}_value"
    return _shorten_identifier(candidate)


def _complex_type_children(complex_type: ET.Element) -> list[ET.Element]:
    children: list[ET.Element] = []
    for child in complex_type:
        child_name = _local_name(child.tag)
        if child_name in {"sequence", "all", "choice"}:
            children.extend(
                grandchild
                for grandchild in child
                if _local_name(grandchild.tag) == "element"
            )
        elif child_name == "element":
            children.append(child)
    return children


def _complex_type_attributes(complex_type: ET.Element) -> list[ET.Element]:
    return [child for child in complex_type if _local_name(child.tag) == "attribute"]


def _extract_table_alias(element: ET.Element) -> str | None:
    annotation = next((child for child in element if _local_name(child.tag) == "annotation"), None)
    if annotation is None:
        return None

    appinfo = next((child for child in annotation if _local_name(child.tag) == "appinfo"), None)
    if appinfo is None:
        return None

    alias_candidates = ["table", "tableName", "alias"]
    for child in appinfo:
        if _local_name(child.tag) not in alias_candidates:
            continue

        alias_value = child.get("name") or child.get("value") or (child.text or "")
        alias_value = alias_value.strip()
        if alias_value:
            return _sanitize_identifier(alias_value)

    appinfo_text = (appinfo.text or "").strip()
    if appinfo_text:
        return _sanitize_identifier(appinfo_text)

    return None


def _read_schema_document(source: str | Path | TextIO) -> tuple[ET.Element, Path | None, Path | None]:
    if isinstance(source, Path):
        resolved_path = source.resolve()
        return ET.parse(resolved_path).getroot(), resolved_path.parent, resolved_path

    if isinstance(source, str):
        source_path = Path(source)
        if source_path.exists():
            resolved_path = source_path.resolve()
            return ET.parse(resolved_path).getroot(), resolved_path.parent, resolved_path
        if source.lstrip().startswith("<"):
            return ET.fromstring(source), None, None

    if hasattr(source, "read"):
        return ET.parse(source).getroot(), None, None

    return ET.fromstring(str(source)), None, None


def _resolve_schema_location(base_dir: Path | None, schema_location: str) -> Path | None:
    candidate = Path(schema_location)
    if candidate.is_absolute() and candidate.exists():
        return candidate.resolve()

    if base_dir is None:
        return candidate.resolve() if candidate.exists() else None

    resolved = (base_dir / candidate).resolve()
    return resolved if resolved.exists() else None


def _load_schema_catalog(xsd_source: str | Path | TextIO) -> _SchemaCatalog:
    catalog = _SchemaCatalog(
        root_elements=[],
        named_complex_types={},
        named_simple_types={},
        elements_by_name={},
    )
    visited_paths: set[Path] = set()

    def load_document(source: str | Path | TextIO) -> None:
        schema_root, base_dir, resolved_path = _read_schema_document(source)

        if resolved_path is not None:
            if resolved_path in visited_paths:
                return
            visited_paths.add(resolved_path)

        for child in schema_root:
            child_name = _local_name(child.tag)

            if child_name in {"include", "import"}:
                schema_location = child.get("schemaLocation")
                if schema_location:
                    resolved_location = _resolve_schema_location(base_dir, schema_location)
                    if resolved_location is not None:
                        load_document(resolved_location)
                continue

            if child_name == "complexType" and child.get("name"):
                catalog.named_complex_types.setdefault(child.get("name"), child)
            elif child_name == "simpleType" and child.get("name"):
                catalog.named_simple_types.setdefault(child.get("name"), child)
            elif child_name == "element" and child.get("name"):
                element_name = child.get("name")
                if element_name not in catalog.elements_by_name:
                    catalog.elements_by_name[element_name] = child
                    catalog.root_elements.append(child)

    load_document(xsd_source)
    return catalog


def _resolve_named_complex_type(
    type_name: str | None,
    named_complex_types: dict[str, ET.Element],
) -> ET.Element | None:
    if not type_name:
        return None
    local_name = type_name.rsplit(":", 1)[-1]
    return named_complex_types.get(local_name)


def _collect_inline_complex_type(element: ET.Element) -> ET.Element | None:
    for child in element:
        if _local_name(child.tag) == "complexType":
            return child
    return None


def _collect_inline_simple_type(element: ET.Element) -> ET.Element | None:
    for child in element:
        if _local_name(child.tag) == "simpleType":
            return child
    return None


def _extract_builtin_simple_type(simple_type: ET.Element) -> str | None:
    restriction = next((child for child in simple_type if _local_name(child.tag) == "restriction"), None)
    if restriction is not None and restriction.get("base"):
        return restriction.get("base")
    return None


def _extract_simple_content_type(complex_type: ET.Element) -> str | None:
    simple_content = next((child for child in complex_type if _local_name(child.tag) == "simpleContent"), None)
    if simple_content is None:
        return None

    extension = next((child for child in simple_content if _local_name(child.tag) == "extension"), None)
    if extension is None:
        return None

    return extension.get("base")


def _extract_element_details(
    element: ET.Element,
    named_complex_types: dict[str, ET.Element],
) -> tuple[list[ET.Element], list[ET.Element], str | None]:
    inline_complex_type = _collect_inline_complex_type(element)
    if inline_complex_type is not None:
        child_elements = _complex_type_children(inline_complex_type)
        attributes = _complex_type_attributes(inline_complex_type)
        simple_value_type = _extract_simple_content_type(inline_complex_type)
        return child_elements, attributes, simple_value_type

    type_name = element.get("type")
    resolved_complex_type = _resolve_named_complex_type(type_name, named_complex_types)
    if resolved_complex_type is not None:
        child_elements = _complex_type_children(resolved_complex_type)
        attributes = _complex_type_attributes(resolved_complex_type)
        simple_value_type = _extract_simple_content_type(resolved_complex_type)
        return child_elements, attributes, simple_value_type

    inline_simple_type = _collect_inline_simple_type(element)
    if inline_simple_type is not None:
        return [], [], _extract_builtin_simple_type(inline_simple_type)

    return [], [], type_name


def _build_table_spec(
    element: ET.Element,
    catalog: _SchemaCatalog,
    tables_by_name: dict[str, TableSpec],
    path_parts: list[str],
    parent_spec: TableSpec | None = None,
    table_prefix: str | None = None,
) -> TableSpec | None:
    element_name = element.get("name") or element.get("ref")
    if not element_name:
        return None

    if element.get("ref"):
        referenced = catalog.elements_by_name.get(element.get("ref", ""))
        if referenced is not None:
            element = referenced
            element_name = element.get("name") or element_name


    child_elements, attributes, simple_value_type = _extract_element_details(
        element,
        catalog.named_complex_types,
    )
    repeatable = _occurs_is_repeatable(element)
    has_attributes = bool(attributes)
    has_child_elements = bool(child_elements)
    is_root = parent_spec is None
    should_create_table = is_root or repeatable or has_attributes or has_child_elements
    table_alias = _extract_table_alias(element)

    if not should_create_table and parent_spec is not None:
        column_name = _column_name_for_child(element_name)
        column_spec = ColumnSpec(
            xml_name=element_name,
            column_name=column_name,
            sql_type=_column_type_for_xsd(simple_value_type),
            nullable=True,
            source="child",
        )
        parent_spec.simple_children[element_name] = column_spec
        parent_spec.columns.append(column_spec)
        return None

    current_path = path_parts + [table_alias or element_name]
    table_name = _table_name_for_path(current_path, table_prefix=table_prefix)
    spec = TableSpec(
        xml_name=element_name,
        table_name=table_name,
        table_alias=table_alias,
        parent_table_name=parent_spec.table_name if parent_spec else None,
        repeatable=repeatable,
    )
    tables_by_name[table_name] = spec

    if parent_spec is not None:
        parent_spec.child_tables[element_name] = spec

    for attribute in attributes:
        attribute_name = attribute.get("name")
        if not attribute_name:
            continue
        column_spec = ColumnSpec(
            xml_name=attribute_name,
            column_name=_column_name_for_attribute(attribute_name),
            sql_type=_column_type_for_xsd(attribute.get("type")),
            nullable=attribute.get("use", "optional") != "required",
            source="attribute",
        )
        spec.columns.append(column_spec)

    if simple_value_type is not None and should_create_table:
        text_column = ColumnSpec(
            xml_name=element_name,
            column_name="value",
            sql_type=_column_type_for_xsd(simple_value_type),
            nullable=True,
            source="text",
        )
        spec.text_column = text_column
        spec.columns.append(text_column)

    for child_element in child_elements:
        _build_table_spec(
            child_element,
            catalog,
            tables_by_name,
            current_path,
            spec,
            table_prefix=table_prefix,
        )

    return spec


def _load_xml_root(source: str | Path | TextIO) -> ET.Element:
    if isinstance(source, Path):
        return ET.parse(source).getroot()
    if isinstance(source, str):
        source_path = Path(source)
        if source_path.exists():
            return ET.parse(source_path).getroot()
        return ET.fromstring(source)
    return ET.parse(source).getroot()


def parse_xsd_schema(
    xsd_source: str | Path | TextIO,
    table_prefix: str | None = None,
) -> SchemaPlan:
    """Parse an XSD file into a table plan."""

    catalog = _load_schema_catalog(xsd_source)

    root_tables: dict[str, TableSpec] = {}
    tables_by_name: dict[str, TableSpec] = {}

    for root_element in catalog.root_elements:
        table_spec = _build_table_spec(
            root_element,
            catalog,
            tables_by_name,
            [],
            None,
            table_prefix=table_prefix,
        )
        if table_spec is not None:
            root_tables[table_spec.xml_name] = table_spec

    return SchemaPlan(root_tables=root_tables, tables_by_name=tables_by_name)


def build_sqlalchemy_metadata(schema_plan: SchemaPlan) -> MetaData:
    """Materialize the schema plan into SQLAlchemy table objects."""

    metadata = MetaData()

    def build_table(table_spec: TableSpec) -> Table:
        if table_spec.table_name in metadata.tables:
            return metadata.tables[table_spec.table_name]

        columns = [Column("id", Integer, primary_key=True, autoincrement=True)]
        if table_spec.parent_table_name:
            parent_column_name = _shorten_identifier(
                f"{_sanitize_identifier(table_spec.parent_table_name)}_id"
            )
            columns.append(
                Column(
                    parent_column_name,
                    Integer,
                    ForeignKey(f"{table_spec.parent_table_name}.id"),
                    nullable=False,
                    index=True,
                )
            )


        seen_columns: set[str] = {"id"}
        for column_spec in table_spec.columns:
            if column_spec.column_name in seen_columns:
                continue
            seen_columns.add(column_spec.column_name)
            columns.append(
                Column(
                    column_spec.column_name,
                    column_spec.sql_type,
                    nullable=column_spec.nullable,
                )
            )

        table = Table(table_spec.table_name, metadata, *columns)

        for child_spec in table_spec.child_tables.values():
            build_table(child_spec)

        return table

    for root_spec in schema_plan.root_tables.values():
        build_table(root_spec)

    return metadata


def create_sqlalchemy_schema(engine: Engine, schema_plan: SchemaPlan) -> MetaData:
    """Create the translated schema in the target database."""

    metadata = build_sqlalchemy_metadata(schema_plan)
    metadata.create_all(engine)
    return metadata


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
            with z.open(target_name, "r") as binary_stream:
                with io.TextIOWrapper(binary_stream, encoding="utf-8") as xml_file:
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
) -> dict[str, int]:
    """Stream XML records into the generated SQLAlchemy schema."""

    if metadata is None:
        metadata = build_sqlalchemy_metadata(schema_plan)

    tables = metadata.tables
    inserted_counts: dict[str, int] = {table_name: 0 for table_name in tables}
    frame_stack: list[_Frame] = []
    completed_top_level_frames = 0
    started_at = time.monotonic()
    last_progress_log_at = started_at

    logger.info("Starting XML stream ingest")

    def get_table(frame: TableSpec) -> Table:
        return tables[frame.table_name]

    def ensure_inserted(frame: _Frame) -> int | None:
        if frame.definition is None:
            return None
        if frame.row_id is not None:
            return frame.row_id

        parent_id: int | None = None
        if frame.parent is not None and frame.parent.definition is not None:
            parent_id = ensure_inserted(frame.parent)

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

        result = session.execute(insert(table).values(**values))
        row_id = result.inserted_primary_key[0]
        frame.row_id = int(row_id)
        inserted_counts[frame.definition.table_name] += 1
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
                        frame_stack.append(_Frame(definition=None, parent=None))
                        continue

                    root_frame = _Frame(definition=root_spec, parent=None)
                    populate_attributes(root_frame, element.attrib)
                    frame_stack.append(root_frame)
                    continue

                parent_frame = current_parent()
                if parent_frame is None or parent_frame.definition is None:
                    frame_stack.append(_Frame(definition=None, parent=parent_frame))
                    continue

                child_spec = parent_frame.definition.child_tables.get(local_name)
                if child_spec is not None:
                    child_frame = _Frame(definition=child_spec, parent=parent_frame)
                    populate_attributes(child_frame, element.attrib)
                    frame_stack.append(child_frame)
                    continue

                simple_column = parent_frame.definition.simple_children.get(local_name)
                if simple_column is not None:
                    frame_stack.append(
                        _Frame(
                            definition=None,
                            parent=parent_frame,
                            simple_column_name=simple_column.column_name,
                        )
                    )
                    continue

                frame_stack.append(_Frame(definition=None, parent=parent_frame))
                continue

            frame = frame_stack.pop()
            text_value = _clean_text(element.text)

            if frame.definition is None:
                if frame.simple_column_name is not None and frame.parent is not None:
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