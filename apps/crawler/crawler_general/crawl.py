"""FTP crawler to retrieve root folders from FTP server."""

from pathlib import Path

from crawler_common import ftp_tools
from crawler_common.ftp_conf import load_env_vars



def main():
    """Main function to fetch and display FTP root folders."""
    ftp_url, ftp_user, ftp_password = load_env_vars(Path(__file__).parent / ".env")
    folders = ftp_tools.get_root_folders(ftp_url, ftp_user, ftp_password)

    print(f"\nRoot folders found: {len(folders)}")
    for folder in folders:
        print(f"  - {folder}")

    return folders


if __name__ == "__main__":
    main()
