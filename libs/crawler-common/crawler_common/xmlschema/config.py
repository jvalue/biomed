"""YAML-based schema customization configuration for XML schema simplification."""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, TextIO

import yaml


@dataclass(slots=True)
class ColumnCustomization:
    """Specification for an explicitly added column or attribute."""

    name: str
    sql_type: str = "string"
    source: str = "attribute"
    nullable: bool = True


@dataclass(slots=True)
class ElementCustomization:
    """Customization rules for a specific XML element or hierarchy path."""

    alias: str | None = None
    store_as: str | None = None
    jsonb: bool | None = None
    skip: bool = False
    add_columns: list[ColumnCustomization] = field(default_factory=list)

    @property
    def is_jsonb(self) -> bool:
        if self.jsonb is not None:
            return self.jsonb
        return (self.store_as or "").strip().lower() in {"json", "jsonb"}


def _parse_customization_item(data: Any) -> ElementCustomization:
    """Parse a single element rule definition into an ElementCustomization."""
    if isinstance(data, str):
        cleaned = data.strip().lower()
        if cleaned in {"json", "jsonb"}:
            return ElementCustomization(store_as="jsonb", jsonb=True)
        if cleaned in {"skip", "ignore"}:
            return ElementCustomization(skip=True)
        return ElementCustomization(alias=data.strip())

    if not isinstance(data, dict):
        return ElementCustomization()

    alias = (
        data.get("alias")
        or data.get("table")
        or data.get("table_name")
        or data.get("tableName")
    )
    store_as = data.get("store_as") or data.get("format") or data.get("type")
    jsonb_val = data.get("jsonb") if data.get("jsonb") is not None else data.get("json")

    jsonb = bool(jsonb_val) if isinstance(jsonb_val, bool) else None
    if isinstance(store_as, str) and store_as.strip().lower() in {"json", "jsonb"}:
        jsonb = True

    skip = bool(
        data.get("skip")
        or data.get("ignore")
        or data.get("skipped")
        or data.get("ignored")
        or False
    )

    add_columns: list[ColumnCustomization] = []
    raw_cols = (
        data.get("add_columns")
        or data.get("columns")
        or data.get("add_attributes")
        or data.get("attributes")
    )
    if isinstance(raw_cols, list):
        for item in raw_cols:
            if isinstance(item, str):
                col_name = item.strip().lstrip("@")
                if col_name:
                    add_columns.append(ColumnCustomization(name=col_name))
            elif isinstance(item, dict):
                col_name = str(
                    item.get("name")
                    or item.get("xml_name")
                    or item.get("column_name")
                    or ""
                ).strip().lstrip("@")
                if col_name:
                    add_columns.append(
                        ColumnCustomization(
                            name=col_name,
                            sql_type=str(item.get("type") or item.get("sql_type") or "string").strip(),
                            source=str(item.get("source") or "attribute").strip(),
                            nullable=bool(item.get("nullable", True)),
                        )
                    )

    return ElementCustomization(
        alias=str(alias).strip() if alias is not None else None,
        store_as=str(store_as).strip().lower() if store_as is not None else None,
        jsonb=jsonb,
        skip=skip,
        add_columns=add_columns,
    )


def _normalize_key(key: str) -> tuple[str, ...]:
    """Convert path string e.g. 'SampleSet/Sample/Attributes' to a tuple of segments."""
    parts = [
        segment.strip()
        for segment in key.replace("\\", "/").split("/")
        if segment.strip()
    ]
    return tuple(parts)


@dataclass(slots=True)
class SchemaCustomizationConfig:
    """Container for schema customization rules with path-based and element matching."""

    rules: list[tuple[tuple[str, ...], ElementCustomization]] = field(
        default_factory=list
    )
    table_prefix: str | None = None

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> SchemaCustomizationConfig:
        table_prefix = (
            data.get("table_prefix")
            or data.get("prefix")
            or data.get("tablePrefix")
        )
        raw_items: dict[str, Any] = {}
        if "elements" in data and isinstance(data["elements"], dict):
            raw_items.update(data["elements"])
        if "tables" in data and isinstance(data["tables"], dict):
            raw_items.update(data["tables"])
        if not raw_items:
            raw_items = {
                k: v
                for k, v in data.items()
                if k not in {"table_prefix", "prefix", "tablePrefix"}
            }

        parsed_rules: list[tuple[tuple[str, ...], ElementCustomization]] = []
        for key, value in raw_items.items():
            if not isinstance(key, str):
                continue
            path_tuple = _normalize_key(key)
            if not path_tuple:
                continue
            customization = _parse_customization_item(value)
            parsed_rules.append((path_tuple, customization))

        # Sort rules so longer (more specific) paths are evaluated first
        parsed_rules.sort(key=lambda item: len(item[0]), reverse=True)
        return cls(
            rules=parsed_rules,
            table_prefix=str(table_prefix).strip() if table_prefix is not None else None,
        )

    def get_customization(self, path: list[str]) -> ElementCustomization | None:
        """Find the most specific customization rule matching the given XML ancestor path."""
        if not path or not self.rules:
            return None

        clean_path = tuple(path)
        lower_path = tuple(segment.lower() for segment in path)

        # 1. First pass: exact case-sensitive matching (longest rule first)
        for rule_path, customization in self.rules:
            if (
                len(clean_path) >= len(rule_path)
                and clean_path[-len(rule_path) :] == rule_path
            ):
                return customization

        # 2. Second pass: case-insensitive matching
        for rule_path, customization in self.rules:
            rule_lower = tuple(segment.lower() for segment in rule_path)
            if (
                len(lower_path) >= len(rule_lower)
                and lower_path[-len(rule_lower) :] == rule_lower
            ):
                return customization

        return None


def _load_config_from_string(source: str) -> SchemaCustomizationConfig:
    if source.startswith("s3://"):
        from urllib.parse import urlparse

        from crawler_common.s3.client import create_s3_client

        parsed_s3 = urlparse(source)
        bucket_name = parsed_s3.netloc
        object_key = parsed_s3.path.lstrip("/")
        endpoint_url = os.getenv("S3_ENDPOINT_URL") or "http://minio:9000"
        s3_client = create_s3_client(endpoint_url=endpoint_url, timeout_seconds=60)

        response = s3_client.get_object(Bucket=bucket_name, Key=object_key)
        content = response["Body"].read().decode("utf-8")
        parsed = yaml.safe_load(content) or {}
        return SchemaCustomizationConfig.from_dict(
            parsed if isinstance(parsed, dict) else {}
        )

    candidate_path = Path(source)
    if candidate_path.exists():
        with candidate_path.open("r", encoding="utf-8") as file:
            parsed = yaml.safe_load(file) or {}
            return SchemaCustomizationConfig.from_dict(
                parsed if isinstance(parsed, dict) else {}
            )

    # Treat as inline YAML string
    parsed = yaml.safe_load(source) or {}
    if isinstance(parsed, dict):
        return SchemaCustomizationConfig.from_dict(parsed)

    return SchemaCustomizationConfig()


def load_schema_config(
    source: SchemaCustomizationConfig | str | Path | dict[str, Any] | TextIO | None,
) -> SchemaCustomizationConfig:
    """Load a SchemaCustomizationConfig from a YAML file, S3 URI, YAML string, or dictionary."""
    if source is None:
        return SchemaCustomizationConfig()
    if isinstance(source, SchemaCustomizationConfig):
        return source
    if isinstance(source, dict):
        return SchemaCustomizationConfig.from_dict(source)
    if isinstance(source, Path):
        with source.open("r", encoding="utf-8") as file:
            parsed = yaml.safe_load(file) or {}
            return SchemaCustomizationConfig.from_dict(
                parsed if isinstance(parsed, dict) else {}
            )

    if hasattr(source, "read"):
        parsed = yaml.safe_load(source) or {}
        return SchemaCustomizationConfig.from_dict(
            parsed if isinstance(parsed, dict) else {}
        )

    if isinstance(source, str):
        return _load_config_from_string(source)

    raise TypeError(f"Unsupported schema config source type: {type(source)}")
