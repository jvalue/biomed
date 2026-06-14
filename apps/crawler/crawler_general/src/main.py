import logging
import os
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin

from sqlalchemy import func, select

from crawler_common.database import (
    get_database_url_from_env,
    get_session,
    init_database,
    ensure_crawler_schema,
)
from crawler_common.ftp import ftp_conf, ftp_tools
from crawler_common.models.db import Base, FTPDiscoveryEntry, FTPDiscoveryRun
from crawler_common.queue import publish_to_queue as publish_to_rabbitmq


logging.basicConfig(
    # TODO: make this configurable via env
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)
# Reduce SQLAlchemy engine logging verbosity by default
logging.getLogger('sqlalchemy.engine').setLevel(logging.WARNING)


ENTRY_BATCH_SIZE = 500
# Treat small timestamp differences (FTP servers/MLSD/MDTM jitter) as unchanged
MODIFIED_TOLERANCE_SECONDS = 60


def _entry_has_changed(
    current: FTPDiscoveryEntry, previous: FTPDiscoveryEntry | None
) -> bool:
    """Return True if an entry is new or differs from the latest known state."""
    if previous is None:
        return True
    if current.is_dir != previous.is_dir:
        return True

    if current.size != previous.size:
        return True

    # Treat small differences in modification times as unchanged (FTP timestamp jitter)
    if current.modified is None and previous.modified is None:
        return False
    if (current.modified is None) != (previous.modified is None):
        return True

    # Both are not None here
    delta = abs((current.modified - previous.modified).total_seconds())
    if delta > MODIFIED_TOLERANCE_SECONDS:
        return True

    return False


def _latest_entries_by_path(
    session,
    paths: list[str],
) -> dict[str, FTPDiscoveryEntry]:
    """Load the most recent known entry for each path across all runs."""
    if not paths:
        return {}

    latest_ids = (
        select(
            FTPDiscoveryEntry.path,
            func.max(FTPDiscoveryEntry.id).label("max_id"),
        )
        .where(FTPDiscoveryEntry.path.in_(paths))
        .group_by(FTPDiscoveryEntry.path)
        .subquery()
    )

    rows = session.execute(
        select(FTPDiscoveryEntry).join(
            latest_ids,
            FTPDiscoveryEntry.id == latest_ids.c.max_id,
        )
    ).scalars().all()
    return {row.path: row for row in rows}


def _flush_discovery_batch(
    session,
    rabbitmq_url: str,
    rabbitmq_queue: str,
    batch: list[tuple[FTPDiscoveryEntry, str | None]],
) -> tuple[int, int, int]:
    """Persist changed entries and publish changed files.

    Returns a tuple of (inserted_count, published_count, skipped_unchanged_count).
    """
    if not batch:
        return 0, 0, 0

    paths = [entry.path for entry, _ in batch]
    previous_by_path = _latest_entries_by_path(session, paths)

    changed = [
        (entry, file_url)
        for entry, file_url in batch
        if _entry_has_changed(entry, previous_by_path.get(entry.path))
    ]

    skipped_unchanged = len(batch) - len(changed)
    batch.clear()

    if not changed:
        return 0, 0, skipped_unchanged

    changed_entries = [entry for entry, _ in changed]
    session.add_all(changed_entries)
    session.commit()

    published = 0
    if rabbitmq_url:
        messages = [
            {"url": file_url, "ftp_run_id": entry.run_id}
            for entry, file_url in changed
            if file_url is not None
        ]
        if messages:
            published = publish_to_rabbitmq(rabbitmq_url, rabbitmq_queue, messages)

    return len(changed_entries), published, skipped_unchanged


def main():
    # Load FTP credentials and ensure .env is processed
    env_path = Path(__file__).parent.parent / ".env"
    ftp_url, ftp_user, ftp_password, ftp_max_depth = ftp_conf.load_env_vars(env_path)
    logger.info(f"FTP Config: ({ftp_url}, {ftp_user}, '****')")

    # Load RabbitMQ configuration from environment
    rabbitmq_url = os.getenv("RABBITMQ_URL", "")
    rabbitmq_queue = os.getenv("RABBITMQ_QUEUE", "download-urls")
    logger.info(f"RabbitMQ Config: URL={rabbitmq_url}, Queue={rabbitmq_queue}")

    # Initialize database connection
    database_url = get_database_url_from_env(env_path)
    logger.info(
        f"Database URL: {database_url.render_as_string(hide_password=True)}"
    )

    # Disable SQLAlchemy echo to reduce verbose SQL logging in production runs
    engine = init_database(database_url, echo=False)
    ensure_crawler_schema(engine)

    # Create tables if they don't exist
    Base.metadata.create_all(engine)
    logger.info("Database tables created/verified")
    
    logger.info("Starting streaming FTP discovery...")
    session = get_session(engine)

    try:
        # Create a new FTPDiscoveryRun for this crawl
        ftp_run = FTPDiscoveryRun(
            ftp_url=ftp_url,
            max_depth=ftp_max_depth,
            started_at=datetime.now(timezone.utc),
        )
        session.add(ftp_run)
        session.flush()  # Get the ID before adding entries

        discovery_batch: list[tuple[FTPDiscoveryEntry, str | None]] = []
        inserted_entries = 0
        published_messages = 0
        skipped_unchanged = 0

        for node, depth in ftp_tools.iter_ftp_nodes(
            ftp_url,
            ftp_user,
            ftp_password,
            max_depth=ftp_max_depth,
        ):
            entry = FTPDiscoveryEntry.from_ftp_node(node, ftp_run.id, depth)
            file_url = None
            if not node.is_dir:
                file_url = urljoin(ftp_url, node.path.lstrip("/"))

            discovery_batch.append((entry, file_url))

            if len(discovery_batch) >= ENTRY_BATCH_SIZE:
                inserted, published, skipped = _flush_discovery_batch(
                    session,
                    rabbitmq_url,
                    rabbitmq_queue,
                    discovery_batch,
                )
                inserted_entries += inserted
                published_messages += published
                skipped_unchanged += skipped

        inserted, published, skipped = _flush_discovery_batch(
            session,
            rabbitmq_url,
            rabbitmq_queue,
            discovery_batch,
        )
        inserted_entries += inserted
        published_messages += published
        skipped_unchanged += skipped

        ftp_run.completed_at = datetime.now(timezone.utc)
        session.commit()
        logger.info(
            f"FTP streaming discovery saved to database (Run ID: {ftp_run.id}, "
            f"Max Depth: {ftp_max_depth}, Inserted: {inserted_entries}, "
            f"Skipped unchanged: {skipped_unchanged})"
        )

        if rabbitmq_url:
            logger.info(
                f"Published {published_messages} download tasks to RabbitMQ queue '{rabbitmq_queue}' "
                f"(FTP run ID: {ftp_run.id})"
            )
        else:
            logger.warning("RabbitMQ URL not configured - skipping queue publishing")

    except Exception as e:
        session.rollback()
        logger.exception(f"Error saving FTP structure to database: {e}")
        raise
    finally:
        session.close()


if __name__ == "__main__":
    main()
