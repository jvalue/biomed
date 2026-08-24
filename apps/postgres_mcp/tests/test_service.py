from __future__ import annotations

import pytest
from sqlalchemy import Column, Integer, MetaData, String, Table, create_engine

from postgres_mcp.server import PostgresMcpSettings, PostgresService


def create_test_database():
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


def make_service(read_only: bool = True) -> PostgresService:
    settings = PostgresMcpSettings(
        database_url="sqlite+pysqlite:///:memory:",
        default_schema="main",
        max_rows=10,
        read_only=read_only,
    )
    engine = create_test_database()
    return PostgresService(settings, engine=engine)


def test_list_tables() -> None:
    service = make_service()
    res = service.list_tables(schema_name="main")

    assert res["schema"] == "main"
    assert res["table_count"] == 2
    table_names = [t["table_name"] for t in res["tables"]]
    assert "pm_articles" in table_names
    assert "pm_authors" in table_names


def test_describe_table() -> None:
    service = make_service()
    meta = service.describe_table("pm_articles", schema_name="main")

    assert meta["table_name"] == "pm_articles"
    assert meta["primary_key"] == ["id"]
    col_names = [c["name"] for c in meta["columns"]]
    assert col_names == ["id", "title", "author"]


def test_describe_table_nonexistent_raises_valueerror() -> None:
    service = make_service()
    with pytest.raises(ValueError, match="does not exist"):
        service.describe_table("non_existent", schema_name="main")


def test_read_table() -> None:
    service = make_service()
    res = service.read_table("pm_articles", schema_name="main", limit=5)

    assert res["count"] == 2
    assert res["rows"][0]["title"] == "Genome Sequencing in Biomedicine"
    assert res["rows"][1]["author"] == "Bob Jones"


def test_execute_query_select() -> None:
    service = make_service()
    res = service.execute_query("SELECT title FROM pm_articles WHERE id = 1")

    assert res["count"] == 1
    assert res["rows"][0]["title"] == "Genome Sequencing in Biomedicine"


def test_execute_query_forbidden_keyword_blocked() -> None:
    service = make_service(read_only=True)
    with pytest.raises(
        PermissionError, match="Only SELECT or WITH queries are allowed"
    ):
        service.execute_query("DROP TABLE pm_articles")

    with pytest.raises(PermissionError, match="forbidden keyword"):
        service.execute_query("SELECT * FROM pm_articles; DELETE FROM pm_articles")


def test_execute_query_limit_coercion() -> None:
    service = make_service()
    res = service.execute_query("SELECT * FROM pm_articles", limit=1)

    assert res["count"] == 1
