"""Entrypoint and orchestration for crawler_general."""

from __future__ import annotations

import logging
import os
from pathlib import Path

from crawler_common.database import (
    ensure_crawler_schema,
    get_database_url_from_env,
    get_session,
    init_database,
)
from crawler_common.ftp import ftp_conf, ftp_tools
from crawler_common.models.db import Base, FTPDiscoveryEntry, FTPDiscoveryRun
from crawler_common.queue import publish_to_queue as publish_to_rabbitmq

from .config import (
    DEFAULT_ENTRY_BATCH_SIZE,
    DEFAULT_MODIFIED_TOLERANCE_SECONDS,
    CrawlerConfig,
    derive_crawl_db_name,
)
from .crawler import crawl_ftp
from .diff import entry_has_changed, get_latest_entries_by_path
from .publisher import flush_discovery_batch
from .urls import build_download_url

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)
# Reduce SQLAlchemy engine logging verbosity by default
logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)

# Backward-compatibility constants
ENTRY_BATCH_SIZE = DEFAULT_ENTRY_BATCH_SIZE
MODIFIED_TOLERANCE_SECONDS = DEFAULT_MODIFIED_TOLERANCE_SECONDS


def _entry_has_changed(
    current: FTPDiscoveryEntry, previous: FTPDiscoveryEntry | None
) -> bool:
    """Backward-compatible wrapper for entry_has_changed."""
    return entry_has_changed(
        current, previous, tolerance_seconds=MODIFIED_TOLERANCE_SECONDS
    )


def _latest_entries_by_path(
    session,
    paths: list[str],
) -> dict[str, FTPDiscoveryEntry]:
    """Backward-compatible wrapper for get_latest_entries_by_path."""
    return get_latest_entries_by_path(session, paths)


def _flush_discovery_batch(
    session,
    rabbitmq_url: str,
    rabbitmq_queue: str,
    batch: list[tuple[FTPDiscoveryEntry, str | None]],
    crawl_db_name: str | None = None,
    tolerance_seconds: int = MODIFIED_TOLERANCE_SECONDS,
) -> tuple[int, int, int]:
    """Backward-compatible wrapper for flush_discovery_batch."""
    return flush_discovery_batch(
        session=session,
        rabbitmq_url=rabbitmq_url,
        rabbitmq_queue=rabbitmq_queue,
        batch=batch,
        crawl_db_name=crawl_db_name,
        tolerance_seconds=tolerance_seconds,
        publish_fn=publish_to_rabbitmq,
    )


# Backward-compatible alias
_download_url_for_node = build_download_url


def main() -> None:
    """Main crawler entrypoint."""
    # Resolve .env path from app root
    env_path = Path(__file__).resolve().parent.parent / ".env"

    # Load FTP credentials
    ftp_url, ftp_user, ftp_password, ftp_max_depth = ftp_conf.load_env_vars(env_path)
    logger.info(f"FTP Config: ({ftp_url}, {ftp_user}, '****')")

    # Load RabbitMQ configuration
    rabbitmq_url = os.getenv("RABBITMQ_URL", "")
    rabbitmq_queue = os.getenv("RABBITMQ_QUEUE", "download-urls")
    logger.info(f"RabbitMQ Config: URL={rabbitmq_url}, Queue={rabbitmq_queue}")

    # Initialize database connection
    database_url = get_database_url_from_env(env_path)
    if hasattr(database_url, "render_as_string"):
        db_repr = database_url.render_as_string(hide_password=True)
    else:
        db_repr = str(database_url)
    logger.info(f"Database URL: {db_repr}")

    engine = init_database(database_url, echo=False)
    ensure_crawler_schema(engine)
    Base.metadata.create_all(engine)
    logger.info("Database tables created/verified")

    # Determine crawl_db_name for downstream downloaders
    explicit_crawl_db_name = os.getenv("CRAWL_DB_NAME")
    crawl_db_name = derive_crawl_db_name(ftp_url, explicit_crawl_db_name)

    config = CrawlerConfig(
        ftp_url=ftp_url,
        ftp_user=ftp_user,
        ftp_password=ftp_password,
        ftp_max_depth=ftp_max_depth,
        rabbitmq_url=rabbitmq_url,
        rabbitmq_queue=rabbitmq_queue,
        crawl_db_name=crawl_db_name,
        database_url=database_url,
        batch_size=ENTRY_BATCH_SIZE,
        tolerance_seconds=MODIFIED_TOLERANCE_SECONDS,
    )

    session = get_session(engine)
    try:
        crawl_ftp(
            session=session,
            config=config,
            iter_nodes_fn=ftp_tools.iter_ftp_nodes,
            flush_batch_fn=_flush_discovery_batch,
            run_model_cls=FTPDiscoveryRun,
        )
    except Exception as e:
        session.rollback()
        logger.exception(f"Error saving FTP structure to database: {e}")
        raise
    finally:
        session.close()


if __name__ == "__main__":
    main()
