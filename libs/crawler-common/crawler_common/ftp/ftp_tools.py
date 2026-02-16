"""Shared FTP utilities for crawler apps."""

from __future__ import annotations

import ftplib
import logging
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

from crawler_common.ftp.ftp_node import FTPNode

logger = logging.getLogger(__name__)


def get_root_folders(ftp_url: str, ftp_user: str, ftp_password: str) -> list[str]:
    """Connect to FTP server and retrieve root folder names."""
    try:
        # Reuse traversal logic to get immediate children at root
        root = get_ftp_structure(ftp_url, ftp_user, ftp_password, max_depth=1)
        # Return only directories
        return [child.name for child in root.children if child.is_dir]
    except ftplib.all_errors as exc:  # pragma: no cover - network dependent
        print(f"FTP error: {exc}")
        raise


def get_ftp_structure(
    ftp_url: str,
    ftp_user: str,
    ftp_password: str,
    max_depth: int = 3,
) -> FTPNode:
    """Recursively retrieve the FTP directory structure up to ``max_depth``."""

    # Validate max_depth to avoid surprising traversal behavior.
    if not isinstance(max_depth, int) or max_depth < 1:
        raise ValueError(f"max_depth must be a positive integer (got {max_depth!r})")

    ftp: ftplib.FTP | None = None
    try:
        logger.info(f"Connecting to FTP server: {ftp_url}")
        logger.info(f"Starting traversal with max_depth={max_depth}")
        ftp, initial_path = _open_ftp_connection(ftp_url, ftp_user, ftp_password)

        # Use the initial path (from URL) as root if provided
        root_path = initial_path or "/"
        root = FTPNode(name=root_path.rstrip("/") or "/", is_dir=True, path=root_path)
        truncated = _traverse_ftp(ftp, root, root_path, depth=0, max_depth=max_depth)

        if truncated:
            logger.warning(
                "Traversal reached max_depth; deeper paths were not explored."
            )
        logger.info("FTP traversal completed")
        return root
    except ftplib.all_errors as exc:  # pragma: no cover - network dependent
        print(f"FTP error: {exc}")
        raise
    finally:
        if ftp is not None:
            try:
                ftp.quit()
            except Exception as exc:
                logger.debug(
                    "Error while quitting FTP connection: %s", exc, exc_info=True
                )


def _open_ftp_connection(
    ftp_url: str, ftp_user: str, ftp_password: str
) -> tuple[ftplib.FTP, str]:
    """Open an FTP connection from a URL or hostname.

    Returns a tuple of (ftp_connection, initial_path).
    """
    parsed = urlparse(ftp_url)
    if parsed.scheme:
        host = parsed.hostname
        port = parsed.port
        initial_path = parsed.path or "/"
    else:
        host = ftp_url
        port = None
        initial_path = "/"

    if not host:
        raise ValueError(f"Invalid FTP URL/host: {ftp_url}")

    # Connect using explicit host/port when provided to avoid passing a scheme
    if port:
        ftp = ftplib.FTP()
        ftp.connect(host, port)
    else:
        ftp = ftplib.FTP(host)

    ftp.login(ftp_user, ftp_password)
    return ftp, initial_path


def _traverse_ftp(
    ftp: ftplib.FTP,
    parent: FTPNode,
    current_path: str,
    depth: int,
    max_depth: int,
) -> bool:
    """Recursively traverse FTP directory structure.

    Returns True if traversal was truncated due to reaching `max_depth` at
    any visited directory (so callers can react without relying on globals).
    """

    if depth >= max_depth:
        return False

    logger.info(f"Traversing: {current_path} (depth {depth}/{max_depth})")

    # Try to change into the directory and list entries; return early on errors.
    try:
        ftp.cwd(current_path)
        entries = list(ftp.mlsd())
        logger.debug(f"Found {len(entries)} entries in {current_path}")
    except ftplib.error_perm:
        # Skip directories without permission
        logger.warning(f"Permission denied: {current_path}")
        return False
    except ftplib.all_errors as exc:  # pragma: no cover - network dependent
        print(f"Error traversing {current_path}: {exc}")
        return False

    truncated = False

    # Helper: build a node from MLSD entry facts
    def _build_node(name: str, facts: dict, path: str) -> FTPNode:
        node = FTPNode(name=name, is_dir=(facts.get("type") == "dir"), path=path)
        f_size, f_modified = _extract_metadata_from_facts(facts)
        node.size = f_size
        node.modified = f_modified
        return node

    # Helper: ensure file metadata using SIZE/MDTM fallbacks when necessary
    def _ensure_file_metadata(node: FTPNode, path: str) -> None:
        if node.is_dir:
            return
        if node.size is None or node.modified is None:
            fetched_size, fetched_modified = _fetch_file_metadata(ftp, path)
            if node.size is None:
                node.size = fetched_size
            if node.modified is None:
                node.modified = fetched_modified

    for name, facts in entries:
        if name in {".", ".."}:
            continue

        path = f"{current_path.rstrip('/')}/{name}"
        node = _build_node(name, facts, path)
        _ensure_file_metadata(node, path)
        parent.children.append(node)

        # If it's a directory, decide whether to descend or mark as truncated.
        if not node.is_dir:
            continue

        if depth < max_depth - 1:
            if _traverse_ftp(ftp, node, path, depth + 1, max_depth):
                truncated = True
        else:
            truncated = True
            logger.debug(f"Max depth reached at {path}; not descending further")

    return truncated



def _parse_modify_ts(value: str) -> datetime | None:
    """Parse RFC 3659 modify timestamp 'YYYYMMDDHHMMSS[.sss]' into UTC datetime."""
    try:
        base = value.split(".")[0]
        dt = datetime.strptime(base, "%Y%m%d%H%M%S")
        return dt.replace(tzinfo=timezone.utc)
    except (ValueError, TypeError) as exc:
        logger.debug("Failed to parse modify timestamp %r: %s", value, exc)
        return None


def _extract_metadata_from_facts(facts: dict) -> tuple[int | None, datetime | None]:
    """Extract size and modified datetime from MLSD facts.

    Returns a tuple (size, modified) where values may be None if unavailable.
    """
    size: int | None = None
    modified: datetime | None = None

    size_val = facts.get("size")
    if size_val is not None:
        try:
            size = int(size_val)
        except (ValueError, TypeError) as exc:
            logger.debug("Invalid size value %r: %s", size_val, exc)
            size = None

    modify_val = facts.get("modify")
    if modify_val:
        modified = _parse_modify_ts(modify_val)

    return size, modified


def _fetch_file_metadata(
    ftp: ftplib.FTP, path: str
) -> tuple[int | None, datetime | None]:
    """Fetch file size and modified datetime using FTP commands as fallbacks.

    Uses `SIZE` and `MDTM` commands. Returns a tuple (size, modified).
    """
    size: int | None = None
    modified: datetime | None = None

    # SIZE: return file size in bytes when supported
    try:
        sz = ftp.size(path)
        if sz is not None:
            size = int(sz)
    except ftplib.error_perm:
        # SIZE not supported or permission denied; leave size as None
        logger.debug("SIZE not permitted for %s", path)
    except Exception as exc:
        logger.debug(
            "Unexpected error running SIZE for %s: %s", path, exc, exc_info=True
        )

    # MDTM: return last modification time (UTC)
    try:
        resp = ftp.sendcmd(f"MDTM {path}")
        parts = resp.split()
        # Typical: '213 YYYYMMDDHHMMSS'
        if len(parts) == 2 and parts[0] == "213":
            modified = _parse_modify_ts(parts[1])
        elif parts and parts[0].startswith("213"):
            # Some servers respond as '213YYYYMMDDHHMMSS'
            ts = parts[0].removeprefix("213")
            modified = _parse_modify_ts(ts)
    except ftplib.error_perm:
        logger.debug("MDTM not permitted for %s", path)
    except Exception as exc:
        logger.debug(
            "Unexpected error running MDTM for %s: %s", path, exc, exc_info=True
        )

    return size, modified