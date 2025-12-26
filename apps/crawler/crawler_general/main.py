"""Sample Hello World application."""

import os
import logging
from pathlib import Path

from crawler_common import ftp_tools
from crawler_common import ftp_conf


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)


def main():
    # Load FTP credentials and ensure .env is processed
    ftp_url, ftp_user, ftp_password = ftp_conf.load_env_vars(Path(__file__).parent / ".env")
    print(f"FTP Config: ({ftp_url}, {ftp_user}, {'*' * len(ftp_password)})")

    # Resolve output filename from environment
    output_file = os.getenv("FTP_STRUCTURE_FILE") or "ftp_structure.txt"
    
    # Resolve max depth from environment (default to 3)
    max_depth_str = os.getenv("FTP_MAX_DEPTH")
    try:
        max_depth = int(max_depth_str) if max_depth_str else 3
    except ValueError:
        print(f"Invalid max depth '{max_depth_str}', defaulting to 3")
        max_depth = 3

    print("\nFetching FTP structure...")
    root = ftp_tools.get_ftp_structure(ftp_url, ftp_user, ftp_password, max_depth=max_depth)

    ftp_tools.write_ftp_structure_to_file(root, output_file)
    print(f"FTP structure written to {output_file} (max_depth={max_depth})")


if __name__ == "__main__":
    main()
