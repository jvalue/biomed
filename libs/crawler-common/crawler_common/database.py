"""Database initialization and connection management for FTP discovery storage."""

from __future__ import annotations

import logging
from typing import Optional

from sqlalchemy import create_engine, Engine
from sqlalchemy.orm import sessionmaker, Session

from crawler_common.models import Base

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
