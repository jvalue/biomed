"""XSD schema parsing and relational TableSpec plan generation."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any, TextIO

try:
    from lxml import etree as ET  # type: ignore
except ImportError:
    import xml.etree.ElementTree as ET  # type: ignore

from crawler_common.xmlschema.config import (
    SchemaCustomizationConfig,
    load_schema_config,
)
from crawler_common.xmlschema.models import (
    JSON_TYPE,
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


def _complex_type_attributes(
    complex_type: ET.Element,
    named_complex_types: dict[str, ET.Element] | None = None,
) -> list[ET.Element]:
    attributes = [
        child for child in complex_type if _local_name(child.tag) == "attribute"
    ]
    for container in complex_type:
        c_name = _local_name(container.tag)
        if c_name in {"simpleContent", "complexContent"}:
            for ext in container:
                if _local_name(ext.tag) in {"extension", "restriction"}:
                    attributes.extend(
                        child
                        for child in ext
                        if _local_name(child.tag) == "attribute"
                    )
                    base_name = ext.get("base")
                    if base_name and named_complex_types:
                        base_key = base_name.rsplit(":", 1)[-1]
                        base_type = named_complex_types.get(base_key)
                        if base_type is not None:
                            attributes.extend(
                                _complex_type_attributes(base_type, named_complex_types)
                            )
    return attributes


def _is_jsonb_element(*elements: ET.Element | None) -> bool:
    for element in elements:
        if element is None:
            continue
        annotation = next(
            (child for child in element if _local_name(child.tag) == "annotation"),
            None,
        )
        if annotation is None:
            continue
        appinfo = next(
            (child for child in annotation if _local_name(child.tag) == "appinfo"),
            None,
        )
        if appinfo is None:
            continue

        for child in appinfo:
            tag = _local_name(child.tag).lower()
            val = (
                child.get("name")
                or child.get("value")
                or child.get("type")
                or (child.text or "")
            ).strip().lower()
            if tag in {"json", "jsonb"} and (not val or val in {"true", "1", "yes"}):
                return True
            if tag in {"store_as", "type", "format", "as"} and val in {"json", "jsonb"}:
                return True
            if val in {"json", "jsonb"}:
                return True

        appinfo_text = (appinfo.text or "").strip().lower()
        if appinfo_text in {"json", "jsonb"}:
            return True

    return False


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

        if source.startswith(("http://", "https://")):
            import tempfile

            import httpx

            filename = Path(source).name or "schema.xsd"
            resp = httpx.get(source, timeout=30.0)
            resp.raise_for_status()
            tmp_file = Path(tempfile.gettempdir()) / filename
            tmp_file.write_bytes(resp.content)
            return ET.fromstring(resp.content), tmp_file.parent, tmp_file

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
) -> Path | str | None:
    if schema_location.startswith(("http://", "https://")):
        filename = Path(schema_location).name
        if base_dir is not None:
            local_candidate = (base_dir / filename).resolve()
            if local_candidate.exists():
                return local_candidate
        return schema_location

    candidate = Path(schema_location)
    if candidate.is_absolute() and candidate.exists():
        return candidate.resolve()

    if base_dir is None:
        return candidate.resolve() if candidate.exists() else None

    resolved = (base_dir / candidate).resolve()
    if resolved.exists():
        return resolved

    local_name_candidate = (base_dir / candidate.name).resolve()
    if local_name_candidate.exists():
        return local_name_candidate

    return None


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


def _extract_simple_content_type(
    complex_type: ET.Element,
    named_complex_types: dict[str, ET.Element] | None = None,
) -> str | None:
    simple_content = next(
        (child for child in complex_type if _local_name(child.tag) == "simpleContent"),
        None,
    )
    if simple_content is not None:
        extension = next(
            (child for child in simple_content if _local_name(child.tag) in {"extension", "restriction"}),
            None,
        )
        if extension is not None:
            return extension.get("base")

    complex_content = next(
        (child for child in complex_type if _local_name(child.tag) == "complexContent"),
        None,
    )
    if complex_content is not None and named_complex_types:
        extension = next(
            (child for child in complex_content if _local_name(child.tag) in {"extension", "restriction"}),
            None,
        )
        if extension is not None:
            base_name = extension.get("base")
            if base_name:
                base_key = base_name.rsplit(":", 1)[-1]
                base_type = named_complex_types.get(base_key)
                if base_type is not None:
                    return _extract_simple_content_type(base_type, named_complex_types)

    return None


def _extract_element_details(
    element: ET.Element,
    named_complex_types: dict[str, ET.Element],
) -> tuple[list[ET.Element], list[ET.Element], str | None]:
    inline_complex_type = _collect_inline_complex_type(element)
    if inline_complex_type is not None:
        child_elements = _complex_type_children(inline_complex_type)
        attributes = _complex_type_attributes(inline_complex_type, named_complex_types)
        simple_value_type = _extract_simple_content_type(inline_complex_type, named_complex_types)
        return child_elements, attributes, simple_value_type

    type_name = element.get("type")
    resolved_complex_type = _resolve_named_complex_type(type_name, named_complex_types)
    if resolved_complex_type is not None:
        child_elements = _complex_type_children(resolved_complex_type)
        attributes = _complex_type_attributes(resolved_complex_type, named_complex_types)
        simple_value_type = _extract_simple_content_type(resolved_complex_type, named_complex_types)
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
    xml_path_parts: list[str] | None = None,
    config: SchemaCustomizationConfig | None = None,
    ancestor_types: frozenset[str] = frozenset(),
) -> TableSpec | None:
    element_name = element.get("name") or element.get("ref")
    if not element_name:
        return None

    if element.get("ref"):
        referenced = catalog.elements_by_name.get(element.get("ref", ""))
        if referenced is not None:
            element = referenced
            element_name = element.get("name") or element_name

    current_xml_path = (xml_path_parts or []) + [element_name]
    customization = config.get_customization(current_xml_path) if config else None
    if customization and customization.skip:
        return None

    type_name = element.get("type")
    type_key = type_name.rsplit(":", 1)[-1] if type_name else None
    if type_key and type_key in ancestor_types:
        return None

    child_elements, attributes, simple_value_type = _extract_element_details(
        element,
        catalog.named_complex_types,
    )
    resolved_complex_type = _resolve_named_complex_type(
        type_name, catalog.named_complex_types
    )
    inline_complex_type = _collect_inline_complex_type(element)

    if customization and customization.jsonb is not None:
        is_jsonb = customization.is_jsonb
    else:
        is_jsonb = _is_jsonb_element(element, resolved_complex_type, inline_complex_type)

    if customization and customization.alias:
        table_alias = _sanitize_identifier(customization.alias)
    else:
        table_alias = _extract_table_alias(element)

    if parent_spec is not None and is_jsonb:
        column_name = _column_name_for_child(table_alias or element_name)
        column_spec = ColumnSpec(
            xml_name=element_name,
            column_name=column_name,
            sql_type=JSON_TYPE,
            nullable=True,
            source="jsonb",
        )
        parent_spec.jsonb_children[element_name] = column_spec
        parent_spec.columns.append(column_spec)
        return None

    active_attributes: list[ET.Element] = []
    for attribute in attributes:
        attr_name = attribute.get("name")
        if not attr_name:
            continue
        attr_customization = (
            config.get_customization(current_xml_path + [f"@{attr_name}"])
            or config.get_customization(current_xml_path + [attr_name])
            if config
            else None
        )
        if attr_customization and attr_customization.skip:
            continue
        active_attributes.append(attribute)

    active_children: list[ET.Element] = []
    for child in child_elements:
        c_name = child.get("name") or child.get("ref")
        if not c_name:
            continue
        c_custom = (
            config.get_customization(current_xml_path + [c_name])
            if config
            else None
        )
        if c_custom and c_custom.skip:
            continue
        active_children.append(child)

    repeatable = _occurs_is_repeatable(element)
    has_attributes = bool(active_attributes)
    has_child_elements = bool(active_children)
    is_root = parent_spec is None
    should_create_table = is_root or repeatable or has_attributes or has_child_elements

    if not should_create_table and parent_spec is not None:
        column_name = _column_name_for_child(table_alias or element_name)
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

    for attribute in active_attributes:
        attribute_name = attribute.get("name")
        column_spec = ColumnSpec(
            xml_name=attribute_name,
            column_name=_column_name_for_attribute(attribute_name),
            sql_type=_column_type_for_xsd(attribute.get("type")),
            nullable=attribute.get("use", "optional") != "required",
            source="attribute",
        )
        spec.columns.append(column_spec)

    if customization is not None and customization.add_columns:
        existing_cols = {c.xml_name for c in spec.columns} | {
            c.column_name for c in spec.columns
        }
        for add_col in customization.add_columns:
            if add_col.name in existing_cols:
                continue
            col_name = (
                _column_name_for_attribute(add_col.name)
                if add_col.source == "attribute"
                else _column_name_for_child(add_col.name)
            )
            col_spec = ColumnSpec(
                xml_name=add_col.name,
                column_name=col_name,
                sql_type=_column_type_for_xsd(add_col.sql_type),
                nullable=add_col.nullable,
                source=add_col.source,
            )
            spec.columns.append(col_spec)
            existing_cols.add(add_col.name)
            existing_cols.add(col_name)

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

    new_ancestors = ancestor_types | {type_key} if type_key else ancestor_types
    for child_element in active_children:
        _build_table_spec(
            child_element,
            catalog,
            tables_by_name,
            current_path,
            spec,
            table_prefix=table_prefix,
            xml_path_parts=current_xml_path,
            config=config,
            ancestor_types=new_ancestors,
        )

    return spec


def parse_xsd_schema(
    xsd_source: str | Path | TextIO,
    table_prefix: str | None = None,
    db_schema: str | None = None,
    config: SchemaCustomizationConfig | str | Path | dict[str, Any] | TextIO | None = None,
) -> SchemaPlan:
    """Parse an XSD file into a table plan with optional YAML customization config."""

    schema_config = load_schema_config(config) if config is not None else None
    if table_prefix is None and schema_config is not None and schema_config.table_prefix is not None:
        table_prefix = schema_config.table_prefix
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
            xml_path_parts=[],
            config=schema_config,
        )
        if table_spec is not None:
            root_tables[table_spec.xml_name] = table_spec

    return SchemaPlan(
        root_tables=root_tables,
        tables_by_name=tables_by_name,
        db_schema=db_schema,
        config=schema_config,
    )
