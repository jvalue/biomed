import os
import logging
from pathlib import Path
from datetime import datetime, timezone

from crawler_common import ftp_tools
from crawler_common import ftp_conf
from crawler_common.database import (
    get_database_url_from_env,
    init_database,
    get_session,
    insert_ftp_nodes_to_database,
)
from crawler_common.models import FTPDiscoveryRun, FTPDiscoveryEntry, Base


# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)


def main():
    # Load FTP credentials and ensure .env is processed
    env_path = Path(__file__).parent / ".env"
    ftp_url, ftp_user, ftp_password = ftp_conf.load_env_vars(env_path)
    print(f"FTP Config: ({ftp_url}, {ftp_user}, '****')")

    # Initialize database connection
    database_url = get_database_url_from_env(env_path)
    print(
        f"Database URL: {database_url.replace(database_url.split('@')[0].split('://')[-1].split(':')[1], '****')}"
    )

    engine = init_database(database_url, echo=True)

    # Create tables if they don't exist
    Base.metadata.create_all(engine)
    print("Database tables created/verified")

    # Resolve max depth from environment (default to 3)
    max_depth_str = os.getenv("FTP_MAX_DEPTH")
    try:
        max_depth = int(max_depth_str) if max_depth_str else 3
    except ValueError:
        print(f"Invalid max depth '{max_depth_str}', defaulting to 3")
        max_depth = 3

    print("\nFetching FTP structure...")
    root = ftp_tools.get_ftp_structure(
        ftp_url, ftp_user, ftp_password, max_depth=max_depth
    )

    # Save FTP structure to database
    print("\nSaving FTP structure to database...")
    session = get_session(engine)

    try:
        # Create a new FTPDiscoveryRun for this crawl
        ftp_run = FTPDiscoveryRun(
            ftp_url=ftp_url,
            max_depth=max_depth,
            started_at=datetime.now(timezone.utc),
            completed_at=datetime.now(timezone.utc),
        )
        session.add(ftp_run)
        session.flush()  # Get the ID before adding entries

        # Recursively insert FTP structure into database
        insert_ftp_nodes_to_database(root, ftp_run.id, session)
        session.commit()
        print(
            f"FTP structure saved to database (Run ID: {ftp_run.id}, Max Depth: {max_depth})"
        )

    except Exception as e:
        session.rollback()
        print(f"Error saving FTP structure to database: {e}")
        raise
    finally:
        session.close()

    # Optionally also write to text file for reference
    output_file = os.getenv("FTP_STRUCTURE_FILE") or "ftp_structure.txt"
    ftp_tools.write_ftp_structure_to_file(root, output_file)
    print(f"FTP structure also written to {output_file} (max_depth={max_depth})")


if __name__ == "__main__":
    main()
