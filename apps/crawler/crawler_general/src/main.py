import os
import logging
from pathlib import Path
from datetime import datetime, timezone

from crawler_common import ftp_tools
from crawler_common import ftp_conf
from crawler_common.database import create_postgres_url, init_database, get_session
from crawler_common.models import FTPDiscoveryRun, FTPDiscoveryEntry, Base


# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)


def main():
    # Load FTP credentials and ensure .env is processed
    ftp_url, ftp_user, ftp_password = ftp_conf.load_env_vars(
        Path(__file__).parent / ".env"
    )
    print(f"FTP Config: ({ftp_url}, {ftp_user}, '****')")

    # Load database configuration from environment
    db_host = os.getenv("DB_HOST", "localhost")
    db_port = int(os.getenv("DB_PORT", "5432"))
    db_name = os.getenv("DB_NAME", "postgres")
    db_user = os.getenv("DB_USER", "postgres")
    db_password = os.getenv("DB_PASSWORD", "postgres")

    # Initialize database connection
    database_url = create_postgres_url(db_host, db_port, db_name, db_user, db_password)
    print(f"Database URL: {database_url.replace(db_password, '****')}")
    
    engine = init_database(database_url, echo=True)
    
    # Create tables if they don't exist
    Base.metadata.create_all(engine)
    print("Database tables created/verified")

    # Demo: Insert a mocked FTPDiscoveryEntry
    print("\nInserting demo FTP discovery data...")
    session = get_session(engine)
    
    try:
        # Create a mock FTPDiscoveryRun
        mock_run = FTPDiscoveryRun(
            ftp_url="ftp://demo.example.com",
            max_depth=3,
            started_at=datetime.now(timezone.utc),
            completed_at=datetime.now(timezone.utc)
        )
        session.add(mock_run)
        session.flush()  # Get the ID before committing
        
        # Create a mock FTPDiscoveryEntry
        mock_entry = FTPDiscoveryEntry(
            run_id=mock_run.id,
            path="/demo/path/to/file.txt",
            name="file.txt",
            is_dir=False,
            size=5497558138880,  # 5 TB - exceeds 32-bit integer limit
            modified=datetime.now(timezone.utc),
            depth=2,
            discovered_at=datetime.now(timezone.utc)
        )
        session.add(mock_entry)
        
        # Commit the transaction
        session.commit()
        print(f"✓ Successfully inserted FTPDiscoveryRun (ID: {mock_run.id}) with FTPDiscoveryEntry (ID: {mock_entry.id})")
        
    except Exception as e:
        session.rollback()
        print(f"✗ Error inserting demo data: {e}")
        raise
    finally:
        session.close()

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
            completed_at=datetime.now(timezone.utc)
        )
        session.add(ftp_run)
        session.flush()  # Get the ID before adding entries
        
        # Recursively traverse the FTP structure and insert into database
        def insert_ftp_nodes(node, run_id, current_depth=0):
            """Recursively insert FTP nodes into the database."""
            entry = FTPDiscoveryEntry.from_ftp_node(node, run_id, current_depth)
            session.add(entry)
            
            # Recursively insert children if this is a directory
            if hasattr(node, 'children') and node.children:
                for child in node.children:
                    insert_ftp_nodes(child, run_id, current_depth + 1)
        
        insert_ftp_nodes(root, ftp_run.id)
        session.commit()
        print(f"✓ FTP structure saved to database (Run ID: {ftp_run.id}, Max Depth: {max_depth})")
        
    except Exception as e:
        session.rollback()
        print(f"✗ Error saving FTP structure to database: {e}")
        raise
    finally:
        session.close()

    # Optionally also write to text file for reference
    output_file = os.getenv("FTP_STRUCTURE_FILE") or "ftp_structure.txt"
    ftp_tools.write_ftp_structure_to_file(root, output_file)
    print(f"FTP structure also written to {output_file} (max_depth={max_depth})")


if __name__ == "__main__":
    main()
