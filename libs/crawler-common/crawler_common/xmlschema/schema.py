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
from sqlalchemy.schema import CreateSchema
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
    if target_schema == "public":
        target_schema = None

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
            Column("target_schema", Text, primary_key=True, default="public"),
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
    if target_schema == "public":
        target_schema = None
    if engine.dialect.name == "postgresql":
        with engine.begin() as conn:
            conn.execute(CreateSchema(INGEST_METADATA_SCHEMA, if_not_exists=True))
            if target_schema and target_schema != "public":
                conn.execute(CreateSchema(target_schema, if_not_exists=True))
    elif engine.dialect.name == "sqlite":
        try:
            from sqlalchemy import event

            if not hasattr(engine, "_attached_sqlite_schemas"):
                engine._attached_sqlite_schemas = set()

                @event.listens_for(engine, "connect")
                def _attach_sqlite_schemas(dbapi_connection, connection_record):
                    cursor = dbapi_connection.cursor()
                    try:
                        cursor.execute("PRAGMA database_list")
                        existing = {row[1] for row in cursor.fetchall()}
                        for sch in engine._attached_sqlite_schemas:
                            if sch not in existing:
                                quoted_sch = f'"{sch.replace(chr(34), chr(34) * 2)}"'
                                cursor.execute(f"ATTACH DATABASE ':memory:' AS {quoted_sch}")
                    finally:
                        cursor.close()

            engine._attached_sqlite_schemas.add(INGEST_METADATA_SCHEMA)
            if target_schema and target_schema != "public":
                engine._attached_sqlite_schemas.add(target_schema)

            with engine.connect() as conn:
                raw_conn = conn.connection
                cursor = raw_conn.cursor()
                try:
                    cursor.execute("PRAGMA database_list")
                    existing = {row[1] for row in cursor.fetchall()}
                    for sch in engine._attached_sqlite_schemas:
                        if sch not in existing:
                            quoted_sch = f'"{sch.replace(chr(34), chr(34) * 2)}"'
                            cursor.execute(f"ATTACH DATABASE ':memory:' AS {quoted_sch}")
                finally:
                    cursor.close()
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
                        default_clause = ""
                        if column.default is not None:
                            default_clause = f" DEFAULT '{column.default.arg}'"
                        quoted_table = preparer.format_table(table)
                        quoted_column = preparer.quote(column.name)
                        alter_query = f"ALTER TABLE {quoted_table} ADD COLUMN {quoted_column} {col_type_sql}{default_clause}"
                        logger.info(
                            "Migrating table '%s': adding missing column '%s' (%s)",
                            table_name,
                            column.name,
                            col_type_sql,
                        )
                        conn.execute(text(alter_query))

                if engine.dialect.name == "postgresql" and short_name == "_ingested_files":
                    try:
                        conn.execute(
                            text(
                                f"""
                                DO $$
                                BEGIN
                                    IF EXISTS (
                                        SELECT 1 FROM information_schema.table_constraints
                                        WHERE table_schema = '{INGEST_METADATA_SCHEMA}' AND table_name = '_ingested_files' AND constraint_type = 'PRIMARY KEY'
                                    ) AND NOT EXISTS (
                                        SELECT 1 FROM information_schema.key_column_usage
                                        WHERE table_schema = '{INGEST_METADATA_SCHEMA}' AND table_name = '_ingested_files' AND column_name = 'target_schema'
                                    ) THEN
                                        ALTER TABLE {INGEST_METADATA_SCHEMA}._ingested_files DROP CONSTRAINT IF EXISTS _ingested_files_pkey;
                                        UPDATE {INGEST_METADATA_SCHEMA}._ingested_files SET target_schema = 'public' WHERE target_schema IS NULL;
                                        ALTER TABLE {INGEST_METADATA_SCHEMA}._ingested_files ALTER COLUMN target_schema SET NOT NULL;
                                        ALTER TABLE {INGEST_METADATA_SCHEMA}._ingested_files ADD PRIMARY KEY (target_schema, file_key);
                                    END IF;
                                END $$;
                                """
                            )
                        )
                    except Exception as exc:
                        logger.debug("Failed updating _ingested_files primary key in Postgres: %s", exc)
    except Exception as exc:
        logger.warning("Auto-migration check skipped or failed: %s", exc)
