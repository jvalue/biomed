"""Shared crawler utilities and models."""

from crawler_common.adapters.s3_adapter import S3Adapter
from crawler_common.ftp.ftp_conf import load_env_vars
from crawler_common.ftp.ftp_node import FTPNode, SourceNode
from crawler_common.ftp.ftp_tools import get_ftp_structure, get_root_folders
from crawler_common.http_client import HttpClient
from crawler_common.models.api import CrawlRequest, CrawlResponse
from crawler_common.runner import CrawlerRunner
from crawler_common.source_adapter import SourceAdapter
from crawler_common.xmlschema import (
    ColumnSpec,
    ElementCustomization,
    SchemaCustomizationConfig,
    SchemaPlan,
    TableSpec,
    build_sqlalchemy_metadata,
    create_sqlalchemy_schema,
    load_schema_config,
    parse_xsd_schema,
    stream_xml_to_database,
)

__all__ = [
    "ColumnSpec",
    "CrawlRequest",
    "CrawlResponse",
    "CrawlerRunner",
    "ElementCustomization",
    "FTPNode",
    "HttpClient",
    "S3Adapter",
    "SchemaCustomizationConfig",
    "SchemaPlan",
    "SourceAdapter",
    "SourceNode",
    "TableSpec",
    "build_sqlalchemy_metadata",
    "create_sqlalchemy_schema",
    "get_ftp_structure",
    "get_root_folders",
    "load_env_vars",
    "load_schema_config",
    "parse_xsd_schema",
    "stream_xml_to_database",
]
