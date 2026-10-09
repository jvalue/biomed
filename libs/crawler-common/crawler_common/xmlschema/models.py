"""Data structures, type mappings, and identifier utilities for XML schema translation."""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from hashlib import sha1
from typing import Any

from sqlalchemy import (
    JSON,
    BigInteger,
    Boolean,
    Date,
    DateTime,
    Float,
    Integer,
    Numeric,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB

try:
    from lxml import etree as ET  # type: ignore
except ImportError:
    import xml.etree.ElementTree as ET  # type: ignore

XSD_NAMESPACE = "http://www.w3.org/2001/XMLSchema"
POSTGRES_IDENTIFIER_LIMIT = 63
DEFAULT_PROGRESS_LOG_EVERY = 500
DEFAULT_PROGRESS_LOG_SECONDS = 5.0
DEFAULT_COMMIT_EVERY = 500
INGEST_METADATA_SCHEMA = "_ingest_metadata"
JSON_TYPE = JSONB().with_variant(JSON(), "sqlite")

_IDENTIFIER_PATTERN = re.compile(r"[^0-9A-Za-z_]+")
_COLLAPSE_PATTERN = re.compile(r"_+")


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
    jsonb_children: dict[str, ColumnSpec] = field(default_factory=dict)
    child_tables: dict[str, TableSpec] = field(default_factory=dict)
    text_column: ColumnSpec | None = None


@dataclass(slots=True)
class SchemaPlan:
    """A parsed XSD schema ready to be materialized in Postgres."""

    root_tables: dict[str, TableSpec]
    tables_by_name: dict[str, TableSpec]
    db_schema: str | None = None


@dataclass(slots=True)
class _SchemaCatalog:
    root_elements: list[ET.Element]
    named_complex_types: dict[str, ET.Element]
    named_simple_types: dict[str, ET.Element]
    elements_by_name: dict[str, ET.Element]


@dataclass(slots=True)
class _Frame:
    definition: TableSpec | None
    parent: _Frame | None
    row_id: int | None = None
    buffered_row: Any = None
    buffered_rows: list[Any] = field(default_factory=list)
    pending_values: dict[str, Any] = field(default_factory=dict)
    text_value: str | None = None
    simple_column_name: str | None = None
    jsonb_column_name: str | None = None
    is_jsonb_root: bool = False
    is_inside_jsonb: bool = False
    element: ET.Element | None = None
    skipped: bool = False
    hash_tokens: list[str] = field(default_factory=list)
    inserted_rows: list[tuple[str, int]] = field(default_factory=list)


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
