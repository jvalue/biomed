import logging
import os
from datetime import datetime, timezone
from pathlib import Path

from crawler_common.database import (
    get_database_url_from_env,
    get_session,
    init_database,
    insert_ftp_nodes_to_database,
)
from crawler_common.ftp import ftp_conf, ftp_tools
from crawler_common.models.db import Base, FTPDiscoveryRun


logging.basicConfig(
    # TODO: make this configurable via env
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


def main():
    # Load FTP credentials and ensure .env is processed
    env_path = Path(__file__).parent.parent / ".env"
    ftp_url, ftp_user, ftp_password = ftp_conf.load_env_vars(env_path)
    logger.info("FTP Config: (%s, %s, '****')", ftp_url, ftp_user)

    # Initialize database connection
    database_url = get_database_url_from_env(env_path)
    logger.info(
        "Database URL: %s", database_url.render_as_string(hide_password=True)
    )

    engine = init_database(database_url, echo=True)

    # Create tables if they don't exist
    Base.metadata.create_all(engine)
    logger.info("Database tables created/verified")

    # Resolve max depth from environment (default to 3)
    max_depth_str = os.getenv("FTP_MAX_DEPTH")
    try:
        max_depth = int(max_depth_str) if max_depth_str else 3
    except ValueError:
        logger.warning("Invalid max depth '%s', defaulting to 3", max_depth_str)
        max_depth = 3

    logger.info("Fetching FTP structure...")
    root = ftp_tools.get_ftp_structure(
        ftp_url, ftp_user, ftp_password, max_depth=max_depth
    )

    # Save FTP structure to database
    logger.info("Saving FTP structure to database...")
    session = get_session(engine)

    try:
        # Create a new FTPDiscoveryRun for this crawl
        ftp_run = FTPDiscoveryRun(
            ftp_url=ftp_url,
            max_depth=max_depth,
            started_at=datetime.now(timezone.utc),
        )
        session.add(ftp_run)
        session.flush()  # Get the ID before adding entries

        # Recursively insert FTP structure into database
        insert_ftp_nodes_to_database(root, ftp_run.id, session)
        ftp_run.completed_at = datetime.now(timezone.utc)
        session.commit()
        logger.info(
            "FTP structure saved to database (Run ID: %s, Max Depth: %s)",
            ftp_run.id,
            max_depth,
        )

    except Exception as e:
        session.rollback()
        logger.exception("Error saving FTP structure to database: %s", e)
        raise
    finally:
        session.close()


if __name__ == "__main__":
    main()
