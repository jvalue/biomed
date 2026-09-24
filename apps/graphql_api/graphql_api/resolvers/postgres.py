"""PostgreSQL resolvers — delegates to the existing PostgresService."""

from __future__ import annotations

from typing import Any

from graphql_api.schema.types import (
    ColumnInfo,
    ForeignKeyInfo,
    IndexInfo,
    QueryResult,
    TableDetail,
    TableInfo,
    UniprotEntry,
    ViewInfo,
    ViewQueryResult,
    ViewRow,
)
from postgres_mcp.server import PostgresMcpSettings, PostgresService


# ---------------------------------------------------------------------------
# Service factory (lazy singleton)
# ---------------------------------------------------------------------------

_service: PostgresService | None = None


def _get_service() -> PostgresService:
    """Return a shared PostgresService instance, created on first call.

    We defer import-time side-effects (DB connection) so the module can be
    imported in tests without requiring a live database.
    """
    global _service
    if _service is None:
        from postgres_mcp.server import load_settings

        settings = load_settings()
        _service = PostgresService(settings)
    return _service


def set_service(service: PostgresService) -> None:
    """Override the shared service instance (useful for testing)."""
    global _service
    _service = service


# ---------------------------------------------------------------------------
# Resolver functions
# ---------------------------------------------------------------------------


def resolve_tables(schema_name: str = "public") -> list[TableInfo]:
    """List all tables in the given schema."""
    result = _get_service().list_tables(schema_name=schema_name)
    return [
        TableInfo(
            table_name=t["table_name"],
            schema_name=t["schema"],
            column_count=t["column_count"],
            primary_key=t.get("primary_key", []),
            row_count=t.get("row_count"),
        )
        for t in result["tables"]
    ]


def resolve_table_detail(
    table_name: str, schema_name: str = "public"
) -> TableDetail:
    """Describe a single table's schema in detail."""
    result = _get_service().describe_table(table_name, schema_name=schema_name)
    return TableDetail(
        table_name=result["table_name"],
        schema_name=result["schema"],
        primary_key=result.get("primary_key", []),
        columns=[
            ColumnInfo(
                name=c["name"],
                type=c["type"],
                nullable=c.get("nullable", True),
                default=c.get("default"),
                autoincrement=c.get("autoincrement", False),
            )
            for c in result["columns"]
        ],
        foreign_keys=[
            ForeignKeyInfo(
                constrained_columns=fk.get("constrained_columns", []),
                referred_schema=fk.get("referred_schema", schema_name),
                referred_table=fk.get("referred_table", ""),
                referred_columns=fk.get("referred_columns", []),
            )
            for fk in result.get("foreign_keys", [])
        ],
        indexes=[
            IndexInfo(
                name=idx.get("name"),
                column_names=idx.get("column_names", []),
                unique=idx.get("unique", False),
            )
            for idx in result.get("indexes", [])
        ],
    )


def resolve_views(schema_name: str = "public") -> list[ViewInfo]:
    """List all views in the given schema."""
    result = _get_service().list_views(schema_name=schema_name)
    return [
        ViewInfo(
            view_name=v["view_name"],
            schema_name=v["schema"],
            column_count=v["column_count"],
            columns=v.get("columns", []),
        )
        for v in result["views"]
    ]


def resolve_view_query(
    view_name: str,
    schema_name: str = "public",
    limit: int = 100,
    offset: int = 0,
) -> ViewQueryResult:
    """Query rows from a database view with pagination."""
    result = _get_service().query_view(
        view_name, schema_name=schema_name, limit=limit, offset=offset
    )
    return ViewQueryResult(
        view_name=result["view_name"],
        schema_name=result["schema"],
        limit=result["limit"],
        offset=result["offset"],
        count=result["count"],
        rows=[ViewRow(data=row) for row in result["rows"]],
    )


def resolve_uniprot_entries(
    query: str | None = None,
    limit: int = 50,
) -> list[UniprotEntry]:
    """Search or list UniProt entry summaries."""
    result = _get_service().get_uniprot_summary(query=query, limit=limit)
    entries: list[UniprotEntry] = []
    for row in result["rows"]:
        # Extract known fields; put the rest in extra_fields
        known_keys = {
            "primary_accession",
            "entry_name",
            "organism_name",
            "gene_names",
            "keywords",
        }
        extra = {k: v for k, v in row.items() if k not in known_keys}
        entries.append(
            UniprotEntry(
                primary_accession=row.get("primary_accession", ""),
                entry_name=row.get("entry_name"),
                organism_name=row.get("organism_name"),
                gene_names=row.get("gene_names"),
                keywords=row.get("keywords"),
                extra_fields=extra if extra else None,
            )
        )
    return entries


def resolve_execute_query(
    sql: str,
    limit: int = 100,
) -> QueryResult:
    """Execute a read-only SQL query."""
    result = _get_service().execute_query(sql, limit=limit)
    return QueryResult(
        count=result["count"],
        rows=[ViewRow(data=row) for row in result["rows"]],
    )
