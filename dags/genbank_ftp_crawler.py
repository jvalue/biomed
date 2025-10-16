"""
DAG to crawl NCBI GenBank FTP server and find all .seq.gz files.

This DAG connects to the NCBI GenBank FTP server, recursively traverses
all subdirectories, and collects paths to all files ending with .seq.gz.
"""

import logging
from datetime import datetime
from typing import Any

from airflow.sdk import dag, task

from jvalue_biomed.crawlers.ftp import (
    filter_by_extension,
    ftp_connect,
    ftp_crawl_recursive,
)


logger = logging.getLogger(__name__)


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
            List of absolute file paths ending with .seq.gz
        """
        ftp_host = "ftp.ncbi.nlm.nih.gov"
        start_path = "/genbank"
        target_extension = ".seq.gz"

        # Create filter for .seq.gz files
        file_filter = filter_by_extension(target_extension)

        # Connect to FTP server and crawl recursively
        with ftp_connect(ftp_host) as ftp:
            return ftp_crawl_recursive(ftp, start_path, file_filter)

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
