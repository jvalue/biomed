"""XSD schema parsing and relational TableSpec plan generation."""

from __future__ import annotations

import os
from pathlib import Path
from typing import TextIO

try:
    from lxml import etree as ET  # type: ignore
except ImportError:
    import xml.etree.ElementTree as ET  # type: ignore

from crawler_common.xmlschema.models import (
    ColumnSpec,
    SchemaPlan,
    TableSpec,
    _column_name_for_attribute,
    _column_name_for_child,
    _column_type_for_xsd,
    _local_name,
    _occurs_is_repeatable,
    _sanitize_identifier,
    _SchemaCatalog,
    _table_name_for_path,
)


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
    annotation = next(
        (child for child in element if _local_name(child.tag) == "annotation"), None
    )
    if annotation is None:
        return None

    appinfo = next(
        (child for child in annotation if _local_name(child.tag) == "appinfo"), None
    )
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


def _read_schema_document(
    source: str | Path | TextIO,
) -> tuple[ET.Element, Path | None, Path | None]:
    if isinstance(source, Path):
        resolved_path = source.resolve()
        return ET.parse(resolved_path).getroot(), resolved_path.parent, resolved_path

    if isinstance(source, str):
        if source.startswith("s3://"):
            import shutil
            import tempfile
            from urllib.parse import urlparse

            from crawler_common.s3.client import create_s3_client

            parsed_s3 = urlparse(source)
            bucket_name = parsed_s3.netloc
            object_key = parsed_s3.path.lstrip("/")

            endpoint_url = os.getenv("S3_ENDPOINT_URL") or "http://minio:9000"
            s3_client = create_s3_client(endpoint_url=endpoint_url, timeout_seconds=60)

            parent_prefix = str(Path(object_key).parent)
            if parent_prefix == ".":
                s3_prefix = ""
            else:
                s3_prefix = f"{parent_prefix}/"

            tmp_dir = Path(tempfile.mkdtemp())
            try:
                list_resp = s3_client.list_objects_v2(
                    Bucket=bucket_name, Prefix=s3_prefix
                )
                for item in list_resp.get("Contents", []):
                    item_key = item.get("Key", "")
                    if item_key.lower().endswith(".xsd"):
                        rel_name = Path(item_key).name
                        s3_client.download_file(
                            bucket_name, item_key, str(tmp_dir / rel_name)
                        )

                target_file = tmp_dir / Path(object_key).name
                if not target_file.exists():
                    s3_client.download_file(bucket_name, object_key, str(target_file))

                tree = ET.parse(target_file)
                return tree.getroot(), tmp_dir, target_file
            except Exception:
                shutil.rmtree(tmp_dir, ignore_errors=True)
                raise

        source_path = Path(source)
        if source_path.exists():
            resolved_path = source_path.resolve()
            return (
                ET.parse(resolved_path).getroot(),
                resolved_path.parent,
                resolved_path,
            )
        if source.lstrip().startswith("<"):
            return ET.fromstring(source), None, None

    if hasattr(source, "read"):
        return ET.parse(source).getroot(), None, None

    return ET.fromstring(str(source)), None, None


def _resolve_schema_location(
    base_dir: Path | None, schema_location: str
) -> Path | None:
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
                    resolved_location = _resolve_schema_location(
                        base_dir, schema_location
                    )
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
    restriction = next(
        (child for child in simple_type if _local_name(child.tag) == "restriction"),
        None,
    )
    if restriction is not None and restriction.get("base"):
        return restriction.get("base")
    return None


def _extract_simple_content_type(complex_type: ET.Element) -> str | None:
    simple_content = next(
        (child for child in complex_type if _local_name(child.tag) == "simpleContent"),
        None,
    )
    if simple_content is None:
        return None

    extension = next(
        (child for child in simple_content if _local_name(child.tag) == "extension"),
        None,
    )
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
