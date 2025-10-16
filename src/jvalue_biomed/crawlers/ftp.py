"""FTP crawling utilities for biomedical data sources."""


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
