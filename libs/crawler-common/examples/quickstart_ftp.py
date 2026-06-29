"""FTP quickstart example for crawler-common.

Requires environment variables: FTP_URL, FTP_USER, FTP_PASSWORD (or a .env file).

Run with:

  python -m examples.quickstart_ftp
"""

from crawler_common.ftp.ftp_conf import load_env_vars
from crawler_common.ftp.ftp_tools import get_ftp_structure


def main() -> None:  # pragma: no cover - example
    ftp_url, ftp_user, ftp_password, max_depth = load_env_vars()
    print("Connecting to:", ftp_url)
    root = get_ftp_structure(ftp_url, ftp_user, ftp_password, max_depth=max_depth)
    print("Root:", root.path)
    for child in root.children:
        print("-", child.name, "(dir)" if child.is_dir else "(file)")


if __name__ == "__main__":
    main()
