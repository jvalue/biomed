"""Database initialization and connection management for FTP discovery storage."""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING, Optional

from sqlalchemy import create_engine, Engine, select
from sqlalchemy.engine import URL
from sqlalchemy.orm import sessionmaker, Session

from crawler_common.models.db import Base, FTPDiscoveryEntry

if TYPE_CHECKING:
    from crawler_common.ftp.ftp_node import FTPNode

logger = logging.getLogger(__name__)


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


def get_database_url_from_env(dotenv_path=None) -> URL:
    """Get database connection URL from environment variables via ftp_conf loader.

    Args:
        dotenv_path: Optional path to a .env file.

    Returns:
        PostgreSQL connection URL.
    """
    from crawler_common.ftp.ftp_conf import load_database_config

    config = load_database_config(dotenv_path)
    return create_postgres_url(
        host=str(config["host"]),
        port=int(config["port"]),
        database=str(config["database"]),
        user=str(config["user"]),
        password=str(config["password"]),
    )


def init_database(database_url: str | URL, echo: bool = False) -> Engine:
    """Initialize database engine.

    Tables must be created manually or already exist.

    Args:
        database_url: PostgreSQL connection URL.
        echo: If True, log all SQL statements.

    Returns:
        SQLAlchemy Engine instance.
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
    SessionLocal = sessionmaker(bind=engine)
    return SessionLocal()


_engine: Optional[Engine] = None


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
    global _engine
    _engine = engine


def insert_ftp_nodes_to_database(
    node: FTPNode,
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
    def iter_nodes(root: FTPNode, start_depth: int):
        stack: list[tuple[FTPNode, int]] = [(root, start_depth)]

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
            ).where(FTPDiscoveryEntry.path.in_(paths))
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
        existing_keys = select_existing(paths)
        new_entries = [e for e, key in zip(entries, keys) if key not in existing_keys]

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
