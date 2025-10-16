"""FTP crawling utilities for biomedical data sources."""

import contextlib
import logging
from collections.abc import Callable, Generator
from ftplib import FTP
from typing import TypeAlias


logger = logging.getLogger(__name__)

# Type alias for filter functions used in FTP crawling
FtpFilterFn: TypeAlias = Callable[[str, str, str], bool]


@contextlib.contextmanager
def ftp_connect(
    host: str,
    user: str = "anonymous",
    passwd: str = "",
    timeout: int = 30,
) -> Generator[FTP, None, None]:
    """
    Context manager for FTP connections with standardized error handling.

    Args:
        host: FTP server hostname
        user: Username for authentication (default: anonymous)
        passwd: Password for authentication (default: empty)
        timeout: Connection timeout in seconds

    Yields:
        Connected FTP instance

    Example:
        >>> with ftp_connect("ftp.example.com") as ftp:
        ...     ftp.cwd("/data")
        ...     items = []
        ...     ftp.retrlines("LIST", items.append)
    """
    ftp = FTP(host, timeout=timeout)
    try:
        ftp.login(user, passwd)
        logger.info(f"Connected to FTP server: {host}")
        yield ftp
    finally:
        try:
            ftp.quit()
        except Exception:
            ftp.close()


def is_ftp_directory(permissions: str) -> bool:
    """
    Check if FTP LIST permissions string indicates a directory.

    Args:
        permissions: Permission string from FTP LIST output (e.g., 'drwxr-xr-x')

    Returns:
        True if the entry is a directory, False otherwise

    Example:
        >>> is_ftp_directory("drwxr-xr-x")
        True
        >>> is_ftp_directory("-rw-r--r--")
        False
    """
    return permissions.startswith("d")


def is_ftp_file(permissions: str) -> bool:
    """
    Check if FTP LIST permissions string indicates a regular file.

    Args:
        permissions: Permission string from FTP LIST output (e.g., '-rw-r--r--')

    Returns:
        True if the entry is a regular file, False otherwise

    Example:
        >>> is_ftp_file("-rw-r--r--")
        True
        >>> is_ftp_file("drwxr-xr-x")
        False
    """
    return permissions.startswith("-")


def parse_ftp_list_item(item: str) -> tuple[str, str] | None:
    """
    Parse a single item from FTP LIST command output.

    Args:
        item: A line from FTP LIST output

    Returns:
        Tuple of (permissions, name) or None if parsing fails

    Example:
        >>> parse_ftp_list_item("drwxr-xr-x 2 ftp ftp 4096 Jan 1 12:00 genbank")
        ('drwxr-xr-x', 'genbank')
        >>> parse_ftp_list_item("-rw-r--r-- 1 ftp ftp 1234 Jan 1 12:00 file.seq.gz")
        ('-rw-r--r--', 'file.seq.gz')
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


def ftp_path_join(base: str, name: str) -> str:
    """
    Join FTP path components, handling root path correctly.

    Args:
        base: Base path (e.g., '/genbank' or '/')
        name: File or directory name to append

    Returns:
        Combined path with proper separator handling

    Example:
        >>> ftp_path_join("/genbank", "data")
        '/genbank/data'
        >>> ftp_path_join("/", "genbank")
        '/genbank'
    """
    if base == "/":
        return f"/{name}"
    return f"{base}/{name}"


def ftp_crawl_recursive(
    ftp: FTP,
    start_path: str,
    filter_fn: FtpFilterFn,
) -> list[str]:
    """
    Recursively crawl FTP directories and collect matching files.

    This function traverses the FTP directory tree starting from start_path,
    applies the filter function to each file, and returns a list of absolute
    paths for all matching files.

    Args:
        ftp: Connected FTP instance
        start_path: Starting directory path to crawl
        filter_fn: Filter function(permissions, filename, full_path) -> bool
                   Return True to include the file in results

    Returns:
        List of absolute file paths that match the filter

    Example:
        >>> with ftp_connect("ftp.example.com") as ftp:
        ...     def my_filter(perms, name, path):
        ...         return is_ftp_file(perms) and name.endswith(".gz")
        ...     files = ftp_crawl_recursive(ftp, "/data", my_filter)
        ...     print(files)
        ['/data/file1.gz', '/data/subdir/file2.gz']
    """
    found_files: list[str] = []

    def crawl_directory(path: str) -> None:
        """Recursively crawl a single directory."""
        logger.info(f"Crawling directory: {path}")

        try:
            ftp.cwd(path)
        except Exception as e:
            logger.warning(f"Cannot access directory {path}: {e}")
            return

        items: list[str] = []
        try:
            ftp.retrlines("LIST", items.append)
        except Exception as e:
            logger.error(f"Error listing directory {path}: {e}")
            return

        for item in items:
            parsed = parse_ftp_list_item(item)
            if parsed is None:
                continue

            permissions, name = parsed
            full_path = ftp_path_join(path, name)

            if is_ftp_directory(permissions):
                crawl_directory(full_path)
                # Return to current directory after recursion
                with contextlib.suppress(Exception):
                    ftp.cwd(path)
            elif is_ftp_file(permissions):
                if filter_fn(permissions, name, full_path):
                    found_files.append(full_path)
                    logger.info(f"Found: {full_path}")

    crawl_directory(start_path)
    logger.info(f"Crawl complete. Found {len(found_files)} matching files")
    return found_files


def filter_by_extension(
    extensions: str | list[str],
    case_sensitive: bool = False,
) -> FtpFilterFn:
    """
    Create a filter function that matches files by extension.

    Args:
        extensions: Single extension string or list of extensions
                    (e.g., ".seq.gz" or [".fa", ".gbk", ".seq.gz"])
        case_sensitive: Whether to match extensions case-sensitively

    Returns:
        Filter function compatible with ftp_crawl_recursive()

    Example:
        >>> filter_fn = filter_by_extension(".seq.gz")
        >>> filter_fn("-rw-r--r--", "file.seq.gz", "/genbank/file.seq.gz")
        True
        >>> filter_fn = filter_by_extension([".fa", ".fasta"])
        >>> filter_fn("-rw-r--r--", "seq.fasta", "/data/seq.fasta")
        True
    """
    ext_list = [extensions] if isinstance(extensions, str) else extensions

    if not case_sensitive:
        ext_list = [ext.lower() for ext in ext_list]

    def filter_fn(_permissions: str, filename: str, _full_path: str) -> bool:
        name_to_check = filename if case_sensitive else filename.lower()
        return any(name_to_check.endswith(ext) for ext in ext_list)

    return filter_fn
