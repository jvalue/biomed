"""Tests for the Biomed Unified MCP server.

These tests verify that the MCP tools correctly delegate to the GraphQL
schema by injecting the same test services used in the graphql_api tests.
"""

from __future__ import annotations

import pytest
from sqlalchemy import Column, Integer, MetaData, String, Table, create_engine

from graphql_api.resolvers import postgres as pg_resolvers
from graphql_api.resolvers import s3 as s3_resolvers
from postgres_mcp.server import PostgresMcpSettings, PostgresService

from biomed_mcp.server import (
    describe_table,
    execute_query,
    get_s3_object_metadata,
    list_s3_objects,
    list_tables,
    list_views,
    query_view,
    read_s3_object,
    search_uniprot,
)


# ---------------------------------------------------------------------------
# Test database setup (mirrors graphql_api tests)
# ---------------------------------------------------------------------------


def _create_test_db_engine():
    engine = create_engine("sqlite+pysqlite:///:memory:")
    metadata = MetaData()

    Table(
        "pm_articles",
        metadata,
        Column("id", Integer, primary_key=True, autoincrement=True),
        Column("title", String, nullable=False),
        Column("author", String, nullable=True),
    )

    metadata.create_all(engine)

    with engine.begin() as conn:
        conn.execute(
            Table("pm_articles", metadata).insert(),
            [
                {"title": "Genome Sequencing in Biomedicine", "author": "Alice Smith"},
                {"title": "XML Data Streaming Patterns", "author": "Bob Jones"},
            ],
        )

    # Create a view for view-related tests
    with engine.begin() as conn:
        conn.exec_driver_sql(
            "CREATE VIEW v_pm_articles AS SELECT id, title FROM pm_articles"
        )

    return engine


def _make_pg_service() -> PostgresService:
    settings = PostgresMcpSettings(
        database_url="sqlite+pysqlite:///:memory:",
        default_schema="main",
        max_rows=100,
        read_only=True,
    )
    return PostgresService(settings, engine=_create_test_db_engine())


class FakeS3Service:
    """Minimal fake S3 service for testing."""

    def list_objects(self, prefix="", delimiter="/", max_keys=100):
        return {
            "bucket": "test-bucket",
            "prefix": prefix,
            "delimiter": delimiter,
            "count": 1,
            "objects": [
                {
                    "key": "pubmed/article_001.xml",
                    "size": 4096,
                    "last_modified": "2025-01-01T00:00:00",
                    "etag": '"abc123"',
                    "content_type": "application/xml",
                }
            ],
            "prefixes": ["pubmed/"],
            "is_truncated": False,
            "next_continuation_token": None,
        }

    def get_object_metadata(self, key):
        return {
            "bucket": "test-bucket",
            "key": key,
            "content_length": 4096,
            "content_type": "application/xml",
            "etag": '"abc123"',
            "last_modified": "2025-01-01T00:00:00",
            "metadata": {},
        }

    def read_object(self, key):
        return "<article><title>Test Article</title></article>"


@pytest.fixture(autouse=True)
def _inject_test_services():
    pg_resolvers.set_service(_make_pg_service())
    s3_resolvers.set_service(FakeS3Service())
    yield
    pg_resolvers.set_service(None)
    s3_resolvers.set_service(None)


# ---------------------------------------------------------------------------
# Tests: PostgreSQL MCP tools
# ---------------------------------------------------------------------------


class TestPostgresTools:
    def test_list_tables(self):
        result = list_tables(schema_name="main")
        table_names = [t["tableName"] for t in result["tables"]]
        assert "pm_articles" in table_names

    def test_describe_table(self):
        result = describe_table(table_name="pm_articles", schema_name="main")
        assert result["tableName"] == "pm_articles"
        assert result["primaryKey"] == ["id"]
        col_names = [c["name"] for c in result["columns"]]
        assert "title" in col_names

    def test_list_views(self):
        result = list_views(schema_name="main")
        view_names = [v["viewName"] for v in result["views"]]
        assert "v_pm_articles" in view_names

    def test_query_view(self):
        result = query_view(
            view_name="v_pm_articles", schema_name="main", limit=10, offset=0
        )
        assert result["count"] == 2
        assert "title" in result["rows"][0]["data"]

    def test_execute_query(self):
        result = execute_query(
            sql="SELECT title FROM pm_articles WHERE id = 1", limit=10
        )
        assert result["count"] == 1
        assert (
            result["rows"][0]["data"]["title"] == "Genome Sequencing in Biomedicine"
        )


# ---------------------------------------------------------------------------
# Tests: S3 MCP tools
# ---------------------------------------------------------------------------


class TestS3Tools:
    def test_list_s3_objects(self):
        result = list_s3_objects(prefix="pubmed/")
        assert result["bucket"] == "test-bucket"
        assert result["count"] == 1
        assert result["objects"][0]["key"] == "pubmed/article_001.xml"

    def test_get_s3_object_metadata(self):
        result = get_s3_object_metadata(key="pubmed/article_001.xml")
        assert result["key"] == "pubmed/article_001.xml"
        assert result["contentLength"] == 4096

    def test_read_s3_object(self):
        result = read_s3_object(key="pubmed/article_001.xml")
        assert result["isBinary"] is False
        assert "<article>" in result["content"]
