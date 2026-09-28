"""Database initialization and connection management for FTP discovery storage."""

from __future__ import annotations

import logging
import os
from collections.abc import Iterator
from typing import TYPE_CHECKING

from dotenv import load_dotenv
from sqlalchemy import Engine, create_engine, inspect, select, text
from sqlalchemy.engine import URL
from sqlalchemy.orm import Session, sessionmaker

from crawler_common.database.db_conf import load_database_config
from crawler_common.models.db import FTPDiscoveryEntry

if TYPE_CHECKING:
    from crawler_common.ftp.ftp_node import SourceNode

logger = logging.getLogger(__name__)


def ensure_crawler_schema(engine: Engine) -> None:
    """Add missing crawler tables/columns to an existing database.

    This is a lightweight compatibility layer for older databases that were
    created before newer model fields such as ``downloaded`` or ``db_name``.
    """

    inspector = inspect(engine)

    def add_column(table_name: str, column_sql: str) -> None:
        with engine.begin() as connection:
            connection.execute(
                text(f"ALTER TABLE {table_name} ADD COLUMN {column_sql}")
            )

    if inspector.has_table("ftp_discovery_entries"):
        entry_columns = {
            column["name"] for column in inspector.get_columns("ftp_discovery_entries")
        }
        if "downloaded" not in entry_columns:
            add_column(
                "ftp_discovery_entries",
                "downloaded BOOLEAN NOT NULL DEFAULT FALSE",
            )

    if inspector.has_table("ftp_discovery_runs"):
        run_columns = {
            column["name"] for column in inspector.get_columns("ftp_discovery_runs")
        }
        if "db_name" not in run_columns:
            add_column(
                "ftp_discovery_runs",
                "db_name VARCHAR(255)",
            )


def create_postgres_url(
    host: str,
    port: int,
    database: str,
    user: str,
    password: str,
) -> URL:
    """Create a PostgreSQL connection URL for psycopg2."""
    return URL.create(
        drivername="postgresql+psycopg2",
        username=user,
        password=password,
        host=host,
        port=port,
        database=database,
    )


def create_sqlite_url(database_path: str) -> URL:
    """Create a SQLite connection URL for pysqlite.

    The `database_path` may be a filesystem path or ':memory:' for an
    in-memory database.
    """
    return URL.create(drivername="sqlite+pysqlite", database=database_path)


def get_database_url_from_env(dotenv_path: str | None = None) -> URL:
    """Get database connection URL from environment variables.

    Args:
        dotenv_path: Optional path to a .env file.

    Returns:
        PostgreSQL connection URL.
    """
    # Allow selecting a simple SQLite mode via `DB_ENGINE=sqlite`.
    # Load dotenv first so callers can pass a .env path.
    if dotenv_path:
        load_dotenv(dotenv_path)
    else:
        load_dotenv()

    db_engine = os.getenv("DB_ENGINE", "postgres").lower()
    if db_engine == "sqlite":
        sqlite_path = os.getenv("DB_SQLITE_PATH", ":memory:")
        return create_sqlite_url(sqlite_path)

    config = load_database_config(dotenv_path)
    return create_postgres_url(
        host=str(config["host"]),
        port=int(config["port"]),
        database=str(config["database"]),
        user=str(config["user"]),
        password=str(config["password"]),
    )


def init_database(database_url: str | URL, echo: bool = False) -> Engine:
    """Initialize a SQLAlchemy Engine from a URL.

    This accepts any SQLAlchemy URL or URL-like string (PostgreSQL, SQLite,
    etc.). Tables are not created automatically — callers should create tables
    (for example via ``Base.metadata.create_all(engine)``) when needed.

    Args:
        database_url: SQLAlchemy connection URL or :class:`sqlalchemy.engine.URL`.
            Examples:
                - Postgres: "postgresql+psycopg2://user:pw@host:5432/dbname"
                - SQLite (in-memory): "sqlite+pysqlite:///:memory:"
        echo: If True, log all SQL statements.

    Returns:
        SQLAlchemy Engine instance.

    Example:
        >>> from crawler_common.database import init_database
        >>> engine = init_database("sqlite+pysqlite:///:memory:")
    """
    logger.info("Initializing database connection")
    engine = create_engine(database_url, echo=echo)
    logger.info("Database engine created")

    return engine


def get_session(engine: Engine) -> Session:
    """Create a new database session.

    Args:
        engine: SQLAlchemy Engine instance.

    Returns:
        A new Session instance.
    """
    return _get_session_factory(engine)()


_engine: Engine | None = None
_session_factory: sessionmaker | None = None
_session_factory_engine: Engine | None = None


def _get_session_factory(engine: Engine) -> sessionmaker:
    """Get a cached session factory for the provided engine."""
    global _session_factory, _session_factory_engine

    if _session_factory is None or _session_factory_engine is not engine:
        _session_factory = sessionmaker(bind=engine)
        _session_factory_engine = engine

    return _session_factory


def get_engine() -> Engine:
    """Get the global database engine (creates it if needed)."""
    global _engine
    if _engine is None:
        raise RuntimeError(
            "Database engine not initialized. Call init_database() first."
        )
    return _engine


def set_engine(engine: Engine) -> None:
    """Set the global database engine."""
    global _engine, _session_factory, _session_factory_engine
    _engine = engine
    _session_factory = sessionmaker(bind=engine)
    _session_factory_engine = engine


def insert_ftp_nodes_to_database(
    node: SourceNode,
    run_id: int,
    session: Session,
    current_depth: int = 0,
    batch_size: int = 500,
    only_changed: bool = True,
) -> None:
    """Insert FTP nodes and their children into the database in batches.

    Args:
        node: FTPNode to insert and traverse.
        run_id: The FTPDiscoveryRun ID to associate entries with.
        session: SQLAlchemy session for database operations.
        current_depth: Current depth in the FTP tree hierarchy.
        batch_size: Number of entries per batch flush.
        only_changed: If True, skip entries that already exist with same values.
    """

    def iter_nodes(
        root: SourceNode, start_depth: int
    ) -> Iterator[tuple[SourceNode, int]]:
        stack: list[tuple[SourceNode, int]] = [(root, start_depth)]

        while stack:
            current_node, depth = stack.pop()
            yield current_node, depth

            if hasattr(current_node, "children") and current_node.children:
                for child in reversed(current_node.children):
                    stack.append((child, depth + 1))

    def entry_keys(entries: list[FTPDiscoveryEntry]) -> tuple[list[tuple], list[str]]:
        keys = [(e.path, e.is_dir, e.size, e.modified) for e in entries]
        return keys, [k[0] for k in keys]

    def select_existing(paths: list[str]) -> set[tuple]:
        if not paths:
            return set()

        rows = session.execute(
            select(
                FTPDiscoveryEntry.path,
                FTPDiscoveryEntry.is_dir,
                FTPDiscoveryEntry.size,
                FTPDiscoveryEntry.modified,
            ).where(
                FTPDiscoveryEntry.run_id == run_id,
                FTPDiscoveryEntry.path.in_(paths),
            )
        ).all()
        return set(rows)

    def flush_batch(entries: list[FTPDiscoveryEntry]) -> None:
        if not entries:
            return

        if not only_changed:
            session.add_all(entries)
            session.flush()
            return

        keys, paths = entry_keys(entries)

        # Filter out entries that already exist with same values to avoid updates.
        existing_keys = select_existing(paths)
        new_entries: list[FTPDiscoveryEntry] = [
            e for e, key in zip(entries, keys) if key not in existing_keys
        ]

        if new_entries:
            session.add_all(new_entries)
            session.flush()

    batch: list[FTPDiscoveryEntry] = []
    for current_node, depth in iter_nodes(node, current_depth):
        batch.append(FTPDiscoveryEntry.from_ftp_node(current_node, run_id, depth))
        if len(batch) >= batch_size:
            flush_batch(batch)
            batch.clear()

    flush_batch(batch)
