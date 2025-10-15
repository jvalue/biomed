"""
DAG to crawl NCBI GenBank FTP server and find all .seq.gz files.

This DAG connects to the NCBI GenBank FTP server, recursively traverses
all subdirectories, and collects paths to all files ending with .seq.gz.
"""

import contextlib
import logging
from datetime import datetime
from ftplib import FTP
from typing import Any

from airflow.sdk import dag, task


logger = logging.getLogger(__name__)


def _parse_ftp_list_item(item: str) -> tuple[str, str] | None:
    """
    Parse a single item from FTP LIST command output.

    Args:
        item: A line from FTP LIST output

    Returns:
        Tuple of (permissions, name) or None if parsing fails
    """
    parts = item.split(None, 8)
    if len(parts) < 9:
        return None

    permissions = parts[0]
    name = parts[8]

    # Skip current and parent directory references
    if name in (".", ".."):
        return None

    return permissions, name


@dag(
    dag_id="genbank_ftp_crawler",
    schedule=None,  # Manual trigger only
    start_date=datetime(2024, 1, 1),
    catchup=False,
    tags=["ftp", "genbank", "crawler"],
    description="Crawl NCBI GenBank FTP server for .seq.gz files",
)
def genbank_ftp_crawler() -> None:
    """Crawl NCBI GenBank FTP server and find all .seq.gz files."""

    @task()
    def crawl_ftp_server() -> list[str]:
        """
        Recursively crawl the GenBank FTP server and collect all .seq.gz file paths.

        Returns:
            List of file paths (relative to /genbank/) ending with .seq.gz
        """
        ftp_host = "ftp.ncbi.nlm.nih.gov"
        base_path = "/genbank"
        target_extension = ".seq.gz"

        found_files: list[str] = []

        logger.info(f"Connecting to FTP server: {ftp_host}")

        with FTP(ftp_host) as ftp:
            # Anonymous login
            ftp.login()
            logger.info(f"Connected to {ftp_host}")

            def crawl_directory(path: str) -> None:
                """
                Recursively crawl a directory on the FTP server.

                Args:
                    path: Current directory path to crawl
                """
                logger.info(f"Crawling directory: {path}")

                try:
                    ftp.cwd(path)
                except Exception as e:
                    logger.warning(f"Cannot access directory {path}: {e}")
                    return

                items: list[str] = []
                try:
                    # List directory contents
                    ftp.retrlines("LIST", items.append)
                except Exception as e:
                    logger.error(f"Error listing directory {path}: {e}")
                    return

                for item in items:
                    parsed = _parse_ftp_list_item(item)
                    if parsed is None:
                        continue

                    permissions, name = parsed
                    full_path = f"{path}/{name}" if path != "/" else f"/{name}"

                    # Check if it's a directory
                    if permissions.startswith("d"):
                        # Recursively crawl subdirectory
                        crawl_directory(full_path)
                        # Return to current directory after recursion
                        with contextlib.suppress(Exception):
                            ftp.cwd(path)
                    elif permissions.startswith("-"):
                        # It's a file - check if it matches our criteria
                        if name.endswith(target_extension):
                            # Store relative path from base_path
                            relative_path = full_path[len(base_path) :].lstrip("/")
                            found_files.append(relative_path)
                            logger.info(f"Found: {relative_path}")

            # Start crawling from base_path
            crawl_directory(base_path)

        logger.info(f"Crawl complete. Found {len(found_files)} .seq.gz files")
        return found_files

    @task()
    def log_results(files: list[str]) -> dict[str, Any]:
        """
        Log summary statistics about the crawl results.

        Args:
            files: List of found file paths

        Returns:
            Dictionary with summary statistics
        """
        logger.info("=== Crawl Results ===")
        logger.info(f"Total .seq.gz files found: {len(files)}")

        if files:
            logger.info("First 10 files:")
            for file_path in files[:10]:
                logger.info(f"  - {file_path}")

            if len(files) > 10:
                logger.info(f"  ... and {len(files) - 10} more files")

        return {
            "total_files": len(files),
            "sample_files": files[:10],
        }

    # Define the task flow
    files = crawl_ftp_server()
    log_results(files)


# Instantiate the DAG
genbank_ftp_crawler()
