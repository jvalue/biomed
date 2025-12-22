"""FTP crawler to retrieve root folders from FTP server."""

import ftplib
from crawler_general import ftp_conf
from crawler_general import ftp_tools



def main():
    """Main function to fetch and display FTP root folders."""
    try:
        ftp_url, ftp_user, ftp_password = ftp_conf.load_env_vars()
        folders = ftp_tools.get_root_folders(ftp_url, ftp_user, ftp_password)
        
        print(f"\nRoot folders found: {len(folders)}")
        for folder in folders:
            print(f"  - {folder}")
        
        return folders
        
    except ValueError as e:
        print(f"Configuration error: {e}")
        raise
    except ftplib.all_errors as e:
        print(f"FTP connection error: {e}")
        raise


if __name__ == "__main__":
    main()
