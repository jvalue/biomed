"""SQLAlchemy DDL schema materialization and auto-migrations."""

from __future__ import annotations

import logging

from sqlalchemy import (
    BigInteger,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    MetaData,
    Table,
    Text,
    text,
)
from sqlalchemy.engine import Engine

from crawler_common.xmlschema.models import (
    INGEST_METADATA_SCHEMA,
    SchemaPlan,
    TableSpec,
    _sanitize_identifier,
    _shorten_identifier,
)

logger = logging.getLogger(__name__)


def build_sqlalchemy_metadata(
    schema_plan: SchemaPlan,
    db_schema: str | None = None,
) -> MetaData:
    """Materialize the schema plan into SQLAlchemy table objects."""

    metadata = MetaData()
    target_schema = db_schema or schema_plan.db_schema

    def build_table(table_spec: TableSpec) -> Table:
        table_key = (
            f"{target_schema}.{table_spec.table_name}"
            if target_schema
            else table_spec.table_name
        )
        if table_key in metadata.tables:
            return metadata.tables[table_key]
        if table_spec.table_name in metadata.tables:
            return metadata.tables[table_spec.table_name]

        columns = [
            Column("id", Integer, primary_key=True, autoincrement=True),
            Column("_xml_hash", Text, index=True, nullable=True),
        ]
        if table_spec.parent_table_name:
            parent_column_name = _shorten_identifier(
                f"{_sanitize_identifier(table_spec.parent_table_name)}_id"
            )
            parent_target = (
                f"{target_schema}.{table_spec.parent_table_name}.id"
                if target_schema
                else f"{table_spec.parent_table_name}.id"
            )
            columns.append(
                Column(
                    parent_column_name,
                    Integer,
                    ForeignKey(parent_target),
                    nullable=False,
                    index=True,
                )
            )

        seen_columns: set[str] = {"id", "_xml_hash"}
        for column_spec in table_spec.columns:
            if column_spec.column_name in seen_columns:
                continue
            seen_columns.add(column_spec.column_name)
            columns.append(
                Column(
                    column_spec.column_name,
                    column_spec.sql_type,
                    nullable=column_spec.nullable,
                )
            )

        table = Table(
            table_spec.table_name,
            metadata,
            *columns,
            schema=target_schema,
        )

        for child_spec in table_spec.child_tables.values():
            build_table(child_spec)

        return table

    for root_spec in schema_plan.root_tables.values():
        build_table(root_spec)

    ingested_key = f"{INGEST_METADATA_SCHEMA}._ingested_files"
    if ingested_key not in metadata.tables and "_ingested_files" not in metadata.tables:
        Table(
            "_ingested_files",
            metadata,
            Column("file_key", Text, primary_key=True),
            Column("file_etag", Text, nullable=True),
            Column("file_size", BigInteger, nullable=True),
            Column("ingested_at", DateTime(timezone=True), nullable=True),
            schema=INGEST_METADATA_SCHEMA,
        )

    return metadata


def create_sqlalchemy_schema(
    engine: Engine,
    schema_plan: SchemaPlan,
    auto_migrate: bool = True,
    db_schema: str | None = None,
) -> MetaData:
    """Create the translated schema in the target database and optionally migrate missing columns."""

    target_schema = db_schema or schema_plan.db_schema
    if engine.dialect.name == "postgresql":
        with engine.begin() as conn:
            conn.execute(text(f"CREATE SCHEMA IF NOT EXISTS {INGEST_METADATA_SCHEMA}"))
            if target_schema and target_schema != "public":
                conn.execute(text(f"CREATE SCHEMA IF NOT EXISTS {target_schema}"))
    elif engine.dialect.name == "sqlite":
        try:
            from sqlalchemy import event

            schemas_to_attach = [INGEST_METADATA_SCHEMA]
            if target_schema and target_schema not in schemas_to_attach:
                schemas_to_attach.append(target_schema)

            @event.listens_for(engine, "connect")
            def _attach_ingest_schema(dbapi_connection, connection_record):
                cursor = dbapi_connection.cursor()
                for sch in schemas_to_attach:
                    cursor.execute(f"ATTACH DATABASE ':memory:' AS {sch}")
                cursor.close()

            with engine.begin() as conn:
                for sch in schemas_to_attach:
                    conn.execute(text(f"ATTACH DATABASE ':memory:' AS {sch}"))
        except Exception as exc:
            logger.debug(
                "Failed attaching SQLite schema %s: %s", target_schema, exc
            )

    metadata = build_sqlalchemy_metadata(schema_plan, db_schema=target_schema)
    metadata.create_all(engine)

    if auto_migrate:
        _auto_migrate_schema(engine, metadata)

    return metadata


def _auto_migrate_schema(engine: Engine, metadata: MetaData) -> None:
    """Add missing columns to existing database tables dynamically."""
    from sqlalchemy import inspect

    try:
        inspector = inspect(engine)
        tables_by_schema: dict[str | None, set[str]] = {}
        preparer = engine.dialect.identifier_preparer

        with engine.begin() as conn:
            for table_name, table in metadata.tables.items():
                schema = table.schema
                if schema not in tables_by_schema:
                    try:
                        tables_by_schema[schema] = set(
                            inspector.get_table_names(schema=schema)
                        )
                    except Exception:
                        tables_by_schema[schema] = set()

                existing_tables = tables_by_schema[schema]
                short_name = table.name
                if (
                    short_name not in existing_tables
                    and table_name not in existing_tables
                ):
                    continue

                try:
                    existing_cols = {
                        col["name"]
                        for col in inspector.get_columns(short_name, schema=schema)
                    }
                except Exception as exc:
                    logger.debug(
                        "Could not inspect columns for table %s: %s", short_name, exc
                    )
                    continue

                for column in table.columns:
                    if column.name not in existing_cols:
                        col_type_sql = str(column.type.compile(engine.dialect))
                        quoted_table = preparer.format_table(table)
                        quoted_column = preparer.quote(column.name)
                        alter_query = f"ALTER TABLE {quoted_table} ADD COLUMN {quoted_column} {col_type_sql}"
                        logger.info(
                            "Migrating table '%s': adding missing column '%s' (%s)",
                            table_name,
                            column.name,
                            col_type_sql,
                        )
                        conn.execute(text(alter_query))
    except Exception as exc:
        logger.warning("Auto-migration check skipped or failed: %s", exc)
