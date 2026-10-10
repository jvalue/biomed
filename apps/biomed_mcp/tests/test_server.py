"""Tests for the Biomed Unified MCP server.

These tests verify that the MCP tools correctly delegate to the GraphQL
schema by injecting the same test services used in the graphql_api tests.
"""

from __future__ import annotations

import pytest
from graphql_api.resolvers import postgres as pg_resolvers
from graphql_api.resolvers import s3 as s3_resolvers
from graphql_api.services.postgres import PostgresMcpSettings, PostgresService
from sqlalchemy import Column, Integer, MetaData, String, Table, create_engine

from biomed_mcp.server import (
    describe_table,
    execute_query,
    get_bioproject_publications,
    get_s3_object_metadata,
    get_uniprot_cross_references,
    list_s3_objects,
    list_tables,
    list_views,
    query_view,
    read_s3_object,
    search_bioproject,
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

    Table(
        "mv_uniprot_entry_overview",
        metadata,
        Column("entry_id", Integer, primary_key=True),
        Column("primary_accession", String, nullable=False),
        Column("entry_name", String, nullable=True),
        Column("dataset", String, nullable=True),
        Column("protein_name", String, nullable=True),
        Column("gene_names", String, nullable=True),
        Column("organism_name", String, nullable=True),
        Column("taxid", String, nullable=True),
        Column("sequence_length", Integer, nullable=True),
        Column("sequence", String, nullable=True),
    )

    Table(
        "mv_bioproject_overview",
        metadata,
        Column("accession", String, primary_key=True),
        Column("archive", String, nullable=True),
        Column("project_name", String, nullable=True),
        Column("project_title", String, nullable=True),
        Column("project_description", String, nullable=True),
        Column("organism_name", String, nullable=True),
        Column("taxid", String, nullable=True),
        Column("supergroup", String, nullable=True),
        Column("project_type", String, nullable=True),
        Column("publication_count", Integer, default=0),
        Column("external_link_count", Integer, default=0),
    )

    Table(
        "mv_bioproject_publications",
        metadata,
        Column("accession", String, primary_key=True),
        Column("pubmed_id", String, nullable=True),
        Column("article_title", String, nullable=True),
        Column("journal_title", String, nullable=True),
        Column("publication_year", String, nullable=True),
        Column("authors", String, nullable=True),
    )

    Table(
        "mv_uniprot_cross_references",
        metadata,
        Column("id", Integer, primary_key=True, autoincrement=True),
        Column("entry_id", Integer, nullable=True),
        Column("primary_accession", String, nullable=True),
        Column("database_type", String, nullable=False),
        Column("database_id", String, nullable=False),
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
        conn.execute(
            Table("mv_uniprot_entry_overview", metadata).insert(),
            [
                {
                    "entry_id": 1001,
                    "primary_accession": "P0C9F0",
                    "entry_name": "1001R_ASFK5",
                    "dataset": "Swiss-Prot",
                    "protein_name": "Protein MGF 100-1R",
                    "gene_names": "Ken-018",
                    "organism_name": "African swine fever virus",
                    "taxid": "561445",
                    "sequence_length": 100,
                    "sequence": "MKVL...",
                }
            ],
        )
        conn.execute(
            Table("mv_bioproject_overview", metadata).insert(),
            [
                {
                    "accession": "PRJNA12345",
                    "archive": "NCBI",
                    "project_name": "Swine Genome Project",
                    "project_title": "Genome analysis of ASFV",
                    "project_description": "Comprehensive genome assembly",
                    "organism_name": "African swine fever virus",
                    "taxid": "561445",
                    "supergroup": "Viruses",
                    "project_type": "SingleOrganism",
                    "publication_count": 3,
                    "external_link_count": 1,
                }
            ],
        )
        conn.execute(
            Table("mv_bioproject_publications", metadata).insert(),
            [
                {
                    "accession": "PRJNA12345",
                    "pubmed_id": "12345678",
                    "article_title": "Sequencing ASFV",
                    "journal_title": "Virology Journal",
                    "publication_year": "2024",
                    "authors": "Jane Doe; John Smith",
                }
            ],
        )
        conn.execute(
            Table("mv_uniprot_cross_references", metadata).insert(),
            [
                {
                    "entry_id": 1001,
                    "primary_accession": "P0C9F0",
                    "database_type": "PDB",
                    "database_id": "8XYZ",
                }
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
        assert result["rows"][0]["data"]["title"] == "Genome Sequencing in Biomedicine"

    def test_search_uniprot(self):
        result = search_uniprot(query="swine")
        assert result["count"] == 1
        entry = result["entries"][0]
        assert entry["primaryAccession"] == "P0C9F0"
        assert entry["entryName"] == "1001R_ASFK5"
        assert entry["taxid"] == "561445"

    def test_search_bioproject(self):
        result = search_bioproject(query="ASFV")
        assert result["count"] == 1
        project = result["projects"][0]
        assert project["accession"] == "PRJNA12345"
        assert project["supergroup"] == "Viruses"
        assert project["publicationCount"] == 3

    def test_get_bioproject_publications(self):
        result = get_bioproject_publications(accession="PRJNA12345")
        assert result["count"] == 1
        pub = result["publications"][0]
        assert pub["pubmedId"] == "12345678"
        assert pub["publicationYear"] == "2024"

    def test_get_uniprot_cross_references(self):
        result = get_uniprot_cross_references(accession="P0C9F0")
        assert result["count"] == 1
        xref = result["crossReferences"][0]
        assert xref["databaseType"] == "PDB"
        assert xref["databaseId"] == "8XYZ"


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
