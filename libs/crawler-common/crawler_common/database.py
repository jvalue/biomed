"""Database initialization and connection management for FTP discovery storage."""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING, Optional

from sqlalchemy import create_engine, Engine
from sqlalchemy.orm import sessionmaker, Session

from crawler_common.models import Base, FTPDiscoveryEntry

if TYPE_CHECKING:
    from crawler_common.ftp_node import FTPNode

logger = logging.getLogger(__name__)


def create_postgres_url(
    host: str,
    port: int,
    database: str,
    user: str,
    password: str,
) -> str:
    """Create a PostgreSQL connection URL for psycopg2."""
    return f"postgresql+psycopg2://{user}:{password}@{host}:{port}/{database}"


def get_database_url_from_env(dotenv_path=None) -> str:
    """Get database connection URL from environment variables via ftp_conf loader.
    
    Args:
        dotenv_path: Optional path to a .env file.
    
    Returns:
        PostgreSQL connection URL.
    """
    from crawler_common.ftp_conf import load_database_config
    
    config = load_database_config(dotenv_path)
    return create_postgres_url(**config)


def init_database(database_url: str, echo: bool = False) -> Engine:
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
    node: FTPNode, run_id: int, session: Session, current_depth: int = 0
) -> None:
    """Recursively insert FTP nodes and their children into the database.
    
    Args:
        node: FTPNode to insert and traverse.
        run_id: The FTPDiscoveryRun ID to associate entries with.
        session: SQLAlchemy session for database operations.
        current_depth: Current depth in the FTP tree hierarchy.
    """
    entry = FTPDiscoveryEntry.from_ftp_node(node, run_id, current_depth)
    session.add(entry)
    
    # Recursively insert children if this is a directory
    if hasattr(node, 'children') and node.children:
        for child in node.children:
            insert_ftp_nodes_to_database(child, run_id, session, current_depth + 1)
