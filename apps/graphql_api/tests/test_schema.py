"""Tests for the Biomed GraphQL API resolvers and schema."""

from __future__ import annotations

import pytest
from sqlalchemy import Column, Integer, MetaData, String, Table, create_engine

from graphql_api.resolvers import postgres as pg_resolvers
from graphql_api.resolvers import s3 as s3_resolvers
from graphql_api.schema.query import schema
from postgres_mcp.server import PostgresMcpSettings, PostgresService


# ---------------------------------------------------------------------------
# Fixtures: in-memory PostgreSQL service (SQLite)
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

    Table(
        "pm_authors",
        metadata,
        Column("author_id", Integer, primary_key=True),
        Column("name", String, nullable=False),
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

    return engine


def _make_pg_service() -> PostgresService:
    settings = PostgresMcpSettings(
        database_url="sqlite+pysqlite:///:memory:",
        default_schema="main",
        max_rows=100,
        read_only=True,
    )
    engine = _create_test_db_engine()
    return PostgresService(settings, engine=engine)


@pytest.fixture(autouse=True)
def _inject_test_services():
    """Inject test service instances into resolvers before each test."""
    pg_resolvers.set_service(_make_pg_service())
    # S3 service is not injected — S3 tests are skipped unless a mock is provided
    yield
    pg_resolvers.set_service(None)
    s3_resolvers.set_service(None)


# ---------------------------------------------------------------------------
# Schema execution helper
# ---------------------------------------------------------------------------


def _execute(query: str, variables: dict | None = None):
    """Execute a GraphQL query synchronously against the Strawberry schema."""
    result = schema.execute_sync(query, variable_values=variables)
    assert result.errors is None, f"GraphQL errors: {result.errors}"
    return result.data


# ---------------------------------------------------------------------------
# Tests: PostgreSQL resolvers via GraphQL
# ---------------------------------------------------------------------------


class TestTablesQuery:
    def test_list_tables(self):
        data = _execute('{ tables(schemaName: "main") { tableName columnCount } }')
        tables = data["tables"]
        names = [t["tableName"] for t in tables]
        assert "pm_articles" in names
        assert "pm_authors" in names

    def test_table_detail(self):
        data = _execute(
            '{ tableDetail(tableName: "pm_articles", schemaName: "main") '
            "{ tableName primaryKey columns { name type nullable } } }"
        )
        detail = data["tableDetail"]
        assert detail["tableName"] == "pm_articles"
        assert detail["primaryKey"] == ["id"]
        col_names = [c["name"] for c in detail["columns"]]
        assert "title" in col_names
        assert "author" in col_names


class TestViewsQuery:
    @pytest.fixture(autouse=True)
    def _create_test_view(self):
        """Create a view in the test database for view-related tests."""
        service = pg_resolvers._get_service()
        with service.engine.begin() as conn:
            conn.exec_driver_sql(
                "CREATE VIEW IF NOT EXISTS v_pm_articles AS "
                "SELECT id, title FROM pm_articles"
            )

    def test_list_views(self):
        data = _execute('{ views(schemaName: "main") { viewName columnCount columns } }')
        views = data["views"]
        assert len(views) >= 1
        view_names = [v["viewName"] for v in views]
        assert "v_pm_articles" in view_names

    def test_query_view(self):
        data = _execute(
            '{ viewQuery(viewName: "v_pm_articles", schemaName: "main", limit: 10) '
            "{ viewName count rows { data } } }"
        )
        result = data["viewQuery"]
        assert result["viewName"] == "v_pm_articles"
        assert result["count"] == 2
        assert "title" in result["rows"][0]["data"]


class TestExecuteQuery:
    def test_select_query(self):
        data = _execute(
            "{ executeQuery(sql: "
            '"SELECT title FROM pm_articles WHERE id = 1"'
            ") { count rows { data } } }"
        )
        result = data["executeQuery"]
        assert result["count"] == 1
        assert result["rows"][0]["data"]["title"] == "Genome Sequencing in Biomedicine"


# ---------------------------------------------------------------------------
# Tests: S3 resolvers (with mock service)
# ---------------------------------------------------------------------------


class FakeS3Service:
    """Minimal fake S3 service for testing resolvers without real S3."""

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


class TestS3Queries:
    @pytest.fixture(autouse=True)
    def _inject_fake_s3(self):
        s3_resolvers.set_service(FakeS3Service())

    def test_list_s3_objects(self):
        data = _execute(
            '{ s3Objects(prefix: "pubmed/") '
            "{ bucket count objects { key size contentType } prefixes } }"
        )
        result = data["s3Objects"]
        assert result["bucket"] == "test-bucket"
        assert result["count"] == 1
        assert result["objects"][0]["key"] == "pubmed/article_001.xml"

    def test_s3_object_metadata(self):
        data = _execute(
            '{ s3ObjectMetadata(key: "pubmed/article_001.xml") '
            "{ key contentType contentLength } }"
        )
        result = data["s3ObjectMetadata"]
        assert result["key"] == "pubmed/article_001.xml"
        assert result["contentLength"] == 4096

    def test_s3_object_content(self):
        data = _execute(
            '{ s3ObjectContent(key: "pubmed/article_001.xml") '
            "{ key content isBinary } }"
        )
        result = data["s3ObjectContent"]
        assert result["isBinary"] is False
        assert "<article>" in result["content"]
