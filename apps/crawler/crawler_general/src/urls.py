"""URL normalization and resolution helpers for crawler_general."""

from urllib.parse import urljoin, urlparse


def build_download_url(ftp_url: str, node_path: str) -> str:
    """Build a download URL relative to the FTP URL path root.

    Avoids duplicating the FTP URL's root path if node_path already includes it.
    """
    normalized_base = ftp_url if ftp_url.endswith("/") else f"{ftp_url}/"
    root_path = urlparse(ftp_url).path.rstrip("/")

    normalized_node_path = node_path.lstrip("/")
    if root_path and root_path != "/":
        root_prefix = root_path.lstrip("/")
        if normalized_node_path.startswith(root_prefix + "/"):
            normalized_node_path = normalized_node_path[len(root_prefix) + 1 :]
        elif normalized_node_path == root_prefix:
            normalized_node_path = ""

    return urljoin(normalized_base, normalized_node_path)
