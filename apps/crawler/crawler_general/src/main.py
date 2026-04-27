import logging
import os
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

from sqlalchemy import select

from crawler_common.database import (
    get_database_url_from_env,
    get_session,
    init_database,
    insert_ftp_nodes_to_database,
)
from crawler_common.ftp import ftp_conf, ftp_tools
from crawler_common.models.db import Base, FTPDiscoveryEntry, FTPDiscoveryRun
from crawler_common.queue import publish_download_urls


logging.basicConfig(
    # TODO: make this configurable via env
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


def build_ftp_download_url(ftp_url: str, node_path: str) -> str:
    parsed = urlparse(ftp_url)
    if parsed.scheme and parsed.netloc:
        scheme = parsed.scheme
        netloc = parsed.netloc
    else:
        scheme = "ftp"
        netloc = ftp_url

    normalized_path = node_path if node_path.startswith("/") else f"/{node_path}"
    return f"{scheme}://{netloc}{normalized_path}"


def main():
    # Load FTP credentials and ensure .env is processed
    env_path = Path(__file__).parent.parent / ".env"
    ftp_url, ftp_user, ftp_password, ftp_max_depth = ftp_conf.load_env_vars(env_path)
    logger.info(f"FTP Config: ({ftp_url}, {ftp_user}, '****')")

    # Initialize database connection
    database_url = get_database_url_from_env(env_path)
    logger.info(f"Database URL: {database_url.render_as_string(hide_password=True)}")

    engine = init_database(database_url, echo=True)

    # Create tables if they don't exist
    Base.metadata.create_all(engine)
    logger.info("Database tables created/verified")
    
    logger.info("Fetching FTP structure...")
    root = ftp_tools.get_ftp_structure(
        ftp_url, ftp_user, ftp_password, max_depth=ftp_max_depth
    )

    # Save FTP structure to database
    logger.info("Saving FTP structure to database...")
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

        # Recursively insert FTP structure into database
        insert_ftp_nodes_to_database(root, ftp_run.id, session)
        ftp_run.completed_at = datetime.now(timezone.utc)
        session.commit()
        logger.info(
            f"FTP structure saved to database (Run ID: {ftp_run.id}, "
            f"Max Depth: {ftp_max_depth})"
        )

        rabbitmq_url = os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672/")
        rabbitmq_queue = os.getenv("RABBITMQ_QUEUE", "download-urls")

        new_file_paths = session.scalars(
            select(FTPDiscoveryEntry.path).where(
                FTPDiscoveryEntry.run_id == ftp_run.id,
                FTPDiscoveryEntry.is_dir.is_(False),
            )
        ).all()

        if new_file_paths:
            download_urls = [
                build_ftp_download_url(ftp_url, file_path)
                for file_path in new_file_paths
            ]
            published_count = publish_download_urls(
                rabbitmq_url=rabbitmq_url,
                queue_name=rabbitmq_queue,
                download_urls=download_urls,
            )
            logger.info(
                "Published %s download URLs to RabbitMQ queue '%s'",
                published_count,
                rabbitmq_queue,
            )
        else:
            logger.info("No new files discovered for queue publishing")

    except Exception as e:
        session.rollback()
        logger.exception(f"Error saving FTP structure to database: {e}")
        raise
    finally:
        session.close()


if __name__ == "__main__":
    main()
