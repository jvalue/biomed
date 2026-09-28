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


def build_sqlalchemy_metadata(schema_plan: SchemaPlan) -> MetaData:
    """Materialize the schema plan into SQLAlchemy table objects."""

    metadata = MetaData()

    def build_table(table_spec: TableSpec) -> Table:
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
            columns.append(
                Column(
                    parent_column_name,
                    Integer,
                    ForeignKey(f"{table_spec.parent_table_name}.id"),
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

        table = Table(table_spec.table_name, metadata, *columns)

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
) -> MetaData:
    """Create the translated schema in the target database and optionally migrate missing columns."""

    if engine.dialect.name == "postgresql":
        with engine.begin() as conn:
            conn.execute(text(f"CREATE SCHEMA IF NOT EXISTS {INGEST_METADATA_SCHEMA}"))
    elif engine.dialect.name == "sqlite":
        try:
            from sqlalchemy import event

            @event.listens_for(engine, "connect")
            def _attach_ingest_schema(dbapi_connection, connection_record):
                cursor = dbapi_connection.cursor()
                cursor.execute(f"ATTACH DATABASE ':memory:' AS {INGEST_METADATA_SCHEMA}")
                cursor.close()

            with engine.begin() as conn:
                conn.execute(text(f"ATTACH DATABASE ':memory:' AS {INGEST_METADATA_SCHEMA}"))
        except Exception as exc:
            logger.debug("Failed attaching SQLite schema %s: %s", INGEST_METADATA_SCHEMA, exc)

    metadata = build_sqlalchemy_metadata(schema_plan)
    metadata.create_all(engine)

    if auto_migrate:
        _auto_migrate_schema(engine, metadata)

    return metadata


def _auto_migrate_schema(engine: Engine, metadata: MetaData) -> None:
    """Add missing columns to existing database tables dynamically."""
    from sqlalchemy import inspect

    try:
        inspector = inspect(engine)
        existing_tables = set(inspector.get_table_names())

        with engine.begin() as conn:
            for table_name, table in metadata.tables.items():
                if table_name not in existing_tables:
                    continue

                existing_cols = {col["name"] for col in inspector.get_columns(table_name)}
                for column in table.columns:
                    if column.name not in existing_cols:
                        col_type_sql = str(column.type.compile(engine.dialect))
                        alter_query = f"ALTER TABLE {table_name} ADD COLUMN {column.name} {col_type_sql}"
                        logger.info(
                            "Migrating table '%s': adding missing column '%s' (%s)",
                            table_name,
                            column.name,
                            col_type_sql,
                        )
                        conn.execute(text(alter_query))
    except Exception as exc:
        logger.warning("Auto-migration check skipped or failed: %s", exc)
