"""Translate XSD schemas into relational tables and stream XML into them."""

from crawler_common.xmlschema.ingestor import (
    process_s3_prefix_ingestion,
    stream_xml_to_database,
)
from crawler_common.xmlschema.models import (
    INGEST_METADATA_SCHEMA,
    ColumnSpec,
    SchemaPlan,
    TableSpec,
)
from crawler_common.xmlschema.parser import parse_xsd_schema
from crawler_common.xmlschema.schema import (
    build_sqlalchemy_metadata,
    create_sqlalchemy_schema,
)

__all__ = [
    "INGEST_METADATA_SCHEMA",
    "ColumnSpec",
    "SchemaPlan",
    "TableSpec",
    "build_sqlalchemy_metadata",
    "create_sqlalchemy_schema",
    "parse_xsd_schema",
    "process_s3_prefix_ingestion",
    "stream_xml_to_database",
]
