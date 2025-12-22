"""Sample Hello World application."""

from pathlib import Path

from crawler_common import ftp_tools
from crawler_common import ftp_conf


def main():
    ftp_url, ftp_user, ftp_password = ftp_conf.load_env_vars(Path(__file__).parent / ".env")
    print(f"FTP Config: ({ftp_url}, {ftp_user}, {'*' * len(ftp_password)})")
    folders = ftp_tools.get_root_folders(ftp_url, ftp_user, ftp_password)
    
    print(f"\nRoot folders found: {len(folders)}")
    for folder in folders:
        print(f"  - {folder}")


if __name__ == "__main__":
    main()
