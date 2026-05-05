import logging
import os
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin

from crawler_common.database import (
    get_database_url_from_env,
    get_session,
    init_database,
    insert_ftp_nodes_to_database,
)
from crawler_common.ftp import ftp_conf, ftp_tools
from crawler_common.models.db import Base, FTPDiscoveryRun
from crawler_common.queue import publish_to_queue as publish_to_rabbitmq


logging.basicConfig(
    # TODO: make this configurable via env
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)
# Reduce SQLAlchemy engine logging verbosity by default
logging.getLogger('sqlalchemy.engine').setLevel(logging.WARNING)


def extract_file_paths(node, base_url, paths=None):
    """Recursively extract all file paths from FTP structure."""
    if paths is None:
        paths = []
    
    for child in node.children:
        child_path = f"{node.path}/{child.name}" if node.path else child.name
        if not child.is_dir:
            # Create full FTP URL using urljoin to handle slashes properly
            file_url = urljoin(base_url, child_path.lstrip("/"))
            paths.append(file_url)
        elif child.children:
            # Recursively process subdirectories
            extract_file_paths(child, base_url, paths)
    
    return paths


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

        # Extract all file URLs from the FTP structure
        file_urls = extract_file_paths(root, ftp_url)
        logger.info(f"Extracted {len(file_urls)} files from FTP structure")
        
        # Publish file URLs to RabbitMQ queue
        if file_urls and rabbitmq_url:
            logger.info(f"Preparing to publish {len(file_urls)} download tasks to RabbitMQ")
            messages = [{"url": url, "ftp_run_id": ftp_run.id} for url in file_urls]
            logger.debug(f"Created message batch with {len(messages)} messages for queue '{rabbitmq_queue}'")
            
            published = publish_to_rabbitmq(rabbitmq_url, rabbitmq_queue, messages)
            
            if published > 0:
                success_rate = (published / len(file_urls)) * 100
                logger.info(
                    f"Successfully published {published}/{len(file_urls)} download tasks "
                    f"({success_rate:.1f}%) to RabbitMQ queue '{rabbitmq_queue}' "
                    f"(FTP run ID: {ftp_run.id})"
                )
            else:
                logger.error(f"Failed to publish any messages to RabbitMQ queue '{rabbitmq_queue}'")
        else:
            if not file_urls:
                logger.warning("No files extracted from FTP structure - nothing to publish")
            elif not rabbitmq_url:
                logger.warning("RabbitMQ URL not configured - skipping queue publishing")
            else:
                logger.warning("No files to publish or RabbitMQ not configured")

    except Exception as e:
        session.rollback()
        logger.exception(f"Error saving FTP structure to database: {e}")
        raise
    finally:
        session.close()


if __name__ == "__main__":
    main()
