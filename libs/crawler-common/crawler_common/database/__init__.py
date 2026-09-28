"""Database utilities package."""

from crawler_common.database.database import (
    create_postgres_url,
    ensure_crawler_schema,
    get_database_url_from_env,
    get_engine,
    get_session,
    init_database,
    insert_ftp_nodes_to_database,
    set_engine,
)
from crawler_common.database.db_conf import load_database_config

__all__ = [
    "create_postgres_url",
    "ensure_crawler_schema",
    "get_database_url_from_env",
    "get_engine",
    "get_session",
    "init_database",
    "insert_ftp_nodes_to_database",
    "load_database_config",
    "set_engine",
]

from crawler_common.database.database import create_sqlite_url  # noqa: F401

__all__.append("create_sqlite_url")
