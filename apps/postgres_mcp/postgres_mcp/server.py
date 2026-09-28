from __future__ import annotations

import os
from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal
from pathlib import Path
from typing import Any
from uuid import UUID

from dotenv import load_dotenv
from mcp.server.fastmcp import FastMCP
from sqlalchemy import Engine, create_engine, inspect, text
from sqlalchemy.engine import URL

DEFAULT_DATABASE_URL = "postgresql+psycopg2://postgres:postgres@localhost:5433/xml-data"
DEFAULT_SCHEMA = "public"
DEFAULT_MAX_ROWS = 500
DEFAULT_READ_ONLY = True


@dataclass(frozen=True, slots=True)
class PostgresMcpSettings:
    database_url: str
    default_schema: str
    max_rows: int
    read_only: bool


APP_DIR = Path(__file__).resolve().parents[1]
load_dotenv(APP_DIR / ".env")


def _env_int(name: str, default: int) -> int:
    value = os.getenv(name)
    if value is None:
        return default
    try:
        return int(value)
    except ValueError:
        return default


def _env_bool(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _build_database_url() -> str:
    url_env = os.getenv("POSTGRES_DATABASE_URL") or os.getenv("POSTGRES_URL")
    if url_env:
        return url_env

    host = os.getenv("POSTGRES_HOST")
    if host:
        port = int(os.getenv("POSTGRES_PORT", "5433"))
        db = os.getenv("POSTGRES_DB", "xml")
        user = os.getenv("POSTGRES_USER", "postgres")
        password = os.getenv("POSTGRES_PASSWORD", "postgres")
        return str(
            URL.create(
                drivername="postgresql+psycopg2",
                username=user,
                password=password,
                host=host,
                port=port,
                database=db,
            )
        )

    return DEFAULT_DATABASE_URL


def load_settings() -> PostgresMcpSettings:
    return PostgresMcpSettings(
        database_url=_build_database_url(),
        default_schema=os.getenv("POSTGRES_SCHEMA", DEFAULT_SCHEMA),
        max_rows=_env_int("POSTGRES_MAX_ROWS", DEFAULT_MAX_ROWS),
        read_only=_env_bool("POSTGRES_READ_ONLY", DEFAULT_READ_ONLY),
    )


class PostgresService:
    def __init__(
        self, settings: PostgresMcpSettings, engine: Engine | None = None
    ) -> None:
        self._settings = settings
        self._engine = engine or create_engine(settings.database_url)

    @property
    def engine(self) -> Engine:
        return self._engine

    def list_tables(self, schema_name: str | None = None) -> dict[str, Any]:
        schema = schema_name or self._settings.default_schema
        inspector = inspect(self._engine)

        table_names = [
            t for t in inspector.get_table_names(schema=schema) if not t.startswith("_")
        ]
        tables_info = []

        with self._engine.connect() as conn:
            for table_name in table_names:
                columns = [
                    c
                    for c in inspector.get_columns(table_name, schema=schema)
                    if not c["name"].startswith("_")
                ]
                pk = inspector.get_pk_constraint(table_name, schema=schema)

                # Attempt row count estimation or exact count
                row_count: int | None = None
                try:
                    count_res = conn.execute(
                        text(f'SELECT COUNT(*) FROM "{schema}"."{table_name}"')
                    ).scalar()
                    row_count = int(count_res) if count_res is not None else 0
                except Exception:
                    row_count = None

                tables_info.append(
                    {
                        "table_name": table_name,
                        "schema": schema,
                        "column_count": len(columns),
                        "primary_key": pk.get("constrained_columns", []),
                        "row_count": row_count,
                        "resource_uri": f"postgres://table/{table_name}",
                    }
                )

        return {
            "schema": schema,
            "table_count": len(tables_info),
            "tables": tables_info,
        }

    def describe_table(
        self, table_name: str, schema_name: str | None = None
    ) -> dict[str, Any]:
        schema = schema_name or self._settings.default_schema
        inspector = inspect(self._engine)

        if not inspector.has_table(table_name, schema=schema) or table_name.startswith(
            "_"
        ):
            raise ValueError(f"Table '{schema}.{table_name}' does not exist.")

        columns_raw = inspector.get_columns(table_name, schema=schema)
        pk = inspector.get_pk_constraint(table_name, schema=schema)
        fks_raw = inspector.get_foreign_keys(table_name, schema=schema)
        indexes_raw = inspector.get_indexes(table_name, schema=schema)

        columns = [
            {
                "name": col["name"],
                "type": str(col["type"]),
                "nullable": col.get("nullable", True),
                "default": str(col.get("default"))
                if col.get("default") is not None
                else None,
                "autoincrement": col.get("autoincrement", False),
            }
            for col in columns_raw
            if not col["name"].startswith("_")
        ]

        foreign_keys = [
            {
                "constrained_columns": fk.get("constrained_columns", []),
                "referred_schema": fk.get("referred_schema") or schema,
                "referred_table": fk.get("referred_table"),
                "referred_columns": fk.get("referred_columns", []),
            }
            for fk in fks_raw
        ]

        indexes = [
            {
                "name": idx.get("name"),
                "column_names": idx.get("column_names", []),
                "unique": idx.get("unique", False),
            }
            for idx in indexes_raw
        ]

        return {
            "schema": schema,
            "table_name": table_name,
            "primary_key": pk.get("constrained_columns", []),
            "columns": columns,
            "foreign_keys": foreign_keys,
            "indexes": indexes,
        }

    def read_table(
        self,
        table_name: str,
        schema_name: str | None = None,
        limit: int | None = None,
        offset: int = 0,
    ) -> dict[str, Any]:
        schema = schema_name or self._settings.default_schema
        inspector = inspect(self._engine)

        if not inspector.has_table(table_name, schema=schema):
            raise ValueError(f"Table '{schema}.{table_name}' does not exist.")

        effective_limit = self._coerce_limit(limit)

        query = text(
            f'SELECT * FROM "{schema}"."{table_name}" LIMIT :limit OFFSET :offset'
        )

        with self._engine.connect() as conn:
            result = conn.execute(
                query, {"limit": effective_limit, "offset": max(0, offset)}
            )
            rows = [
                {col: self._serialize_value(val) for col, val in row._mapping.items()}
                for row in result
            ]

        return {
            "schema": schema,
            "table_name": table_name,
            "limit": effective_limit,
            "offset": offset,
            "count": len(rows),
            "rows": rows,
        }

    def execute_query(
        self,
        sql: str,
        params: dict[str, Any] | None = None,
        limit: int | None = None,
    ) -> dict[str, Any]:
        cleaned_sql = sql.strip().strip(";")
        lowercased_sql = cleaned_sql.lower()

        if self._settings.read_only:
            if not (
                lowercased_sql.startswith("select") or lowercased_sql.startswith("with")
            ):
                raise PermissionError(
                    "Only SELECT or WITH queries are allowed when "
                    "POSTGRES_READ_ONLY is enabled."
                )

            forbidden_keywords = {
                "insert",
                "update",
                "delete",
                "drop",
                "alter",
                "create",
                "truncate",
            }
            words = set(lowercased_sql.split())
            matched_forbidden = words.intersection(forbidden_keywords)
            if matched_forbidden:
                kw_str = ", ".join(sorted(matched_forbidden))
                raise PermissionError(f"Query contains forbidden keyword(s): {kw_str}")

        effective_limit = self._coerce_limit(limit)

        if "limit" not in lowercased_sql:
            final_sql = f"{cleaned_sql} LIMIT {effective_limit}"
        else:
            final_sql = cleaned_sql

        with self._engine.connect() as conn:
            result = conn.execute(text(final_sql), params or {})
            if result.returns_rows:
                rows = [
                    {
                        col: self._serialize_value(val)
                        for col, val in row._mapping.items()
                    }
                    for row in result
                ]
                return {
                    "count": len(rows),
                    "rows": rows,
                }

            return {
                "count": 0,
                "rows": [],
            }

    def _coerce_limit(self, requested_limit: int | None) -> int:
        if requested_limit is None or requested_limit <= 0:
            return self._settings.max_rows
        return min(requested_limit, self._settings.max_rows)

    def _serialize_value(self, val: Any) -> Any:
        if isinstance(val, (datetime, date)):
            return val.isoformat()
        if isinstance(val, (Decimal, UUID)):
            return str(val)
        if isinstance(val, bytes):
            return val.hex()
        return val


settings = load_settings()
service = PostgresService(settings)
mcp = FastMCP("Biomed Postgres Browser", json_response=True)


@mcp.resource("postgres://tables")
def postgres_tables_root() -> dict[str, object]:
    """Summary list of all ingested database tables."""
    return service.list_tables()


@mcp.resource("postgres://table/{table_name}")
def postgres_table_schema(table_name: str) -> dict[str, object]:
    """Detailed schema description for a single table."""
    return service.describe_table(table_name)


@mcp.tool()
def list_tables(schema_name: str = "public") -> dict[str, object]:
    """List tables in the database along with column and row counts."""
    return service.list_tables(schema_name=schema_name)


@mcp.tool()
def describe_table(table_name: str, schema_name: str = "public") -> dict[str, object]:
    """Get table metadata (columns, primary keys, foreign keys, indexes)."""
    return service.describe_table(table_name, schema_name=schema_name)


@mcp.tool()
def read_table(
    table_name: str,
    schema_name: str = "public",
    limit: int = 100,
    offset: int = 0,
) -> dict[str, object]:
    """Read rows from a table with pagination."""
    return service.read_table(
        table_name, schema_name=schema_name, limit=limit, offset=offset
    )


@mcp.tool()
def execute_query(
    sql: str,
    params: dict[str, Any] | None = None,
    limit: int = 100,
) -> dict[str, object]:
    """Execute a read-only SQL query on the PostgreSQL database."""
    return service.execute_query(sql, params=params, limit=limit)


def run() -> None:
    transport = os.getenv("MCP_TRANSPORT", "stdio")
    port_val = int(os.getenv("FASTMCP_PORT") or os.getenv("PORT") or "8002")
    host_val = os.getenv("FASTMCP_HOST") or os.getenv("HOST") or "127.0.0.1"

    mcp.settings.port = port_val
    mcp.settings.host = host_val

    mcp.run(transport=transport)
