"""Shared FTP utilities for crawler apps."""

from __future__ import annotations

import ftplib
import logging
import time
from collections.abc import Iterator
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
        logger.exception(f"FTP error: {exc}")
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
        logger.exception(f"FTP error: {exc}")
        raise
    finally:
        if ftp is not None:
            try:
                ftp.quit()
            except Exception as exc:
                logger.debug(
                    "Error while quitting FTP connection: %s", exc, exc_info=True
                )


def iter_ftp_nodes(
    ftp_url: str,
    ftp_user: str,
    ftp_password: str,
    max_depth: int = 3,
) -> Iterator[tuple[FTPNode, int]]:
    """Iterate FTP nodes lazily as ``(node, depth)`` pairs.

    This avoids constructing and keeping the entire FTP tree in memory.
    Depth 0 corresponds to the root node.
    """
    if not isinstance(max_depth, int) or max_depth < 1:
        raise ValueError(f"max_depth must be a positive integer (got {max_depth!r})")

    ftp: ftplib.FTP | None = None
    try:
        logger.info(f"Connecting to FTP server: {ftp_url}")
        logger.info(f"Starting streaming traversal with max_depth={max_depth}")
        ftp, initial_path = _open_ftp_connection(ftp_url, ftp_user, ftp_password)

        root_path = initial_path or "/"
        root = FTPNode(name=root_path.rstrip("/") or "/", is_dir=True, path=root_path)
        yield root, 0
        yield from _iter_traverse_ftp(ftp, root_path, depth=0, max_depth=max_depth)
        logger.info("FTP streaming traversal completed")
    except ftplib.all_errors as exc:  # pragma: no cover - network dependent
        logger.exception(f"FTP error: {exc}")
        raise
    finally:
        if ftp is not None:
            try:
                ftp.quit()
            except Exception as exc:
                logger.debug(
                    "Error while quitting FTP connection: %s", exc, exc_info=True
                )


def _iter_traverse_ftp(
    ftp: ftplib.FTP,
    current_path: str,
    depth: int,
    max_depth: int,
) -> Iterator[tuple[FTPNode, int]]:
    """Yield child FTP nodes lazily without storing a full tree."""
    if depth >= max_depth:
        return

    logger.info(f"Traversing: {current_path} (depth {depth}/{max_depth})")
    entries = _list_entries(ftp, current_path)
    if entries is None:
        return

    child_depth = depth + 1
    for name, facts in entries:
        if name in {".", ".."}:
            continue

        path = _child_path(current_path, name)
        node = _build_node(name, facts, path)
        _ensure_file_metadata(ftp, node, path)
        _verify_is_dir(ftp, node)
        yield node, child_depth

        if not node.is_dir:
            continue

        if depth < max_depth - 1:
            yield from _iter_traverse_ftp(ftp, path, child_depth, max_depth)
        else:
            logger.debug(f"Max depth reached at {path}; not descending further")


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

    # Store reconnect information on the FTP object so callers can attempt
    # to recover from broken control connections (BrokenPipeError, resets).
    try:
        ftp._reconnect_info = {"host": host, "port": port, "user": ftp_user, "passwd": ftp_password}
    except Exception:
        # Non-fatal; best-effort only.
        pass

    return ftp, initial_path


def _reconnect_ftp(ftp: ftplib.FTP, retries: int = 2, delay: float = 1.0) -> bool:
    """Attempt to reconnect the given FTP object using stored reconnect info.

    Returns True on success, False otherwise.
    """
    info = getattr(ftp, "_reconnect_info", None)
    if not info:
        logger.debug("No reconnect info available on FTP object")
        return False

    host = info.get("host")
    port = info.get("port")
    user = info.get("user")
    passwd = info.get("passwd")

    for attempt in range(1, retries + 1):
        try:
            try:
                ftp.close()
            except Exception:
                # best-effort close
                pass

            if port:
                ftp.connect(host, port, timeout=30)
            else:
                ftp.connect(host, timeout=30)
            ftp.login(user, passwd)
            logger.debug("Reconnected FTP on attempt %d", attempt)
            return True
        except Exception as exc:
            logger.debug("FTP reconnect attempt %d failed: %s", attempt, exc)
            if attempt < retries:
                time.sleep(delay)

    logger.debug("All FTP reconnect attempts failed")
    return False


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

    entries = _list_entries(ftp, current_path)
    if entries is None:
        return False

    truncated = False

    for name, facts in entries:
        if _process_entry(ftp, parent, name, facts, current_path, depth, max_depth):
            truncated = True

    return truncated


def _list_entries(
    ftp: ftplib.FTP, current_path: str
) -> list[tuple[str, dict]] | None:
    """List entries in the current directory, handling FTP errors."""
    try:
        return _mlsd_listing(ftp, current_path)
    except ftplib.error_perm:
        logger.warning(f"Permission denied: {current_path}")
        return None
    except EOFError:
        # Some servers close the connection unexpectedly during MLSD.
        logger.debug(
            "EOFError from MLSD on %s: falling back to NLST/LIST", current_path
        )
    except BrokenPipeError as exc:
        # Broken control connection; attempt to reconnect and retry MLSD once.
        logger.debug("BrokenPipeError during MLSD on %s: %s", current_path, exc)
        if _reconnect_ftp(ftp):
            try:
                return _mlsd_listing(ftp, current_path)
            except Exception as exc2:
                logger.exception("Retry after reconnect failed for %s: %s", current_path, exc2)
    except ftplib.all_errors as exc:  # pragma: no cover - network dependent
        logger.exception(f"Error traversing {current_path}: {exc}")

    # Attempt a tolerant fallback using NLST and directory detection
    try:
        entries = _nlst_fallback(ftp, current_path)
        logger.debug(
            "Found %d entries in %s using NLST fallback", len(entries), current_path
        )
        return entries
    except Exception as fallback_exc:
        # If the fallback failed due to a broken pipe, try reconnecting once
        if isinstance(fallback_exc, BrokenPipeError):
            logger.debug("Broken pipe during NLST fallback on %s: %s", current_path, fallback_exc)
            if _reconnect_ftp(ftp):
                try:
                    entries = _nlst_fallback(ftp, current_path)
                    logger.debug(
                        "Found %d entries in %s using NLST fallback after reconnect", len(entries), current_path
                    )
                    return entries
                except Exception as fallback_exc2:
                    logger.exception(
                        "Fallback after reconnect failed for %s: %s", current_path, fallback_exc2
                    )

        logger.exception(
            "Fallback listing failed for %s: %s", current_path, fallback_exc
        )
        return None


def _mlsd_listing(ftp: ftplib.FTP, current_path: str) -> list[tuple[str, dict]]:
    """Attempt MLSD listing for the given path; may raise EOFError or ftplib errors.

    Returns a list of (name, facts) tuples.
    """
    ftp.cwd(current_path)
    entries = list(ftp.mlsd())
    logger.debug(f"Found {len(entries)} entries in {current_path} using MLSD")
    return entries


def _nlst_fallback(ftp: ftplib.FTP, current_path: str) -> list[tuple[str, dict]]:
    """NLST-based fallback listing that best-effort detects directories."""
    previous_path = ftp.pwd()
    try:
        ftp.cwd(current_path)
        names = ftp.nlst()
    finally:
        try:
            ftp.cwd(previous_path)
        except Exception:
            pass

    entries: list[tuple[str, dict]] = []
    for name in names:
        if name in {".", ".."}:
            continue
        facts: dict = {}
        try:
            cur = ftp.pwd()
            ftp.cwd(name)
            facts["type"] = "dir"
            ftp.cwd(cur)
        except ftplib.error_perm:
            facts["type"] = "file"
        except Exception:
            facts = {}
        entries.append((name, facts))
    return entries


def _process_entry(
    ftp: ftplib.FTP,
    parent: FTPNode,
    name: str,
    facts: dict,
    current_path: str,
    depth: int,
    max_depth: int,
) -> bool:
    """Handle a single directory entry; returns True if traversal truncated here.

    This extracts path, builds node, ensures metadata, verifies directory status,
    appends the node and descends into directories when appropriate.
    """
    if name in {".", ".."}:
        return False

    path = _child_path(current_path, name)
    node = _build_node(name, facts, path)
    _ensure_file_metadata(ftp, node, path)
    _verify_is_dir(ftp, node)
    parent.children.append(node)

    if not node.is_dir:
        return False

    return _maybe_descend(ftp, node, path, depth, max_depth)


def _child_path(current_path: str, name: str) -> str:
    """Build a child path from a parent path and name."""
    return f"{current_path.rstrip('/')}/{name}"


def _maybe_descend(
    ftp: ftplib.FTP,
    node: FTPNode,
    path: str,
    depth: int,
    max_depth: int,
) -> bool:
    """Return True if traversal is truncated while handling a directory."""
    if depth < max_depth - 1:
        return _traverse_ftp(ftp, node, path, depth + 1, max_depth)

    logger.debug(f"Max depth reached at {path}; not descending further")
    return True


def _build_node(name: str, facts: dict, path: str) -> FTPNode:
    """Build a FTPNode from MLSD entry facts."""
    node = FTPNode(name=name, is_dir=(facts.get("type") == "dir"), path=path, downloaded=False)
    f_size, f_modified = _extract_metadata_from_facts(facts)
    node.size = f_size
    node.modified = f_modified
    return node


def _verify_is_dir(ftp: ftplib.FTP, node: FTPNode) -> None:
    """Attempt to verify if a node marked as file is actually a directory.
    
    This is a best-effort check using CWD; if changing into the path succeeds,
    mark it as a directory.
    Modifies node.is_dir in-place.
    """
    if node.is_dir:
        return  # Already marked as directory
    
    try:
        current_path = ftp.pwd()
        try:
            ftp.cwd(node.path)
            logger.debug(f"Verified {node.path} is a directory (CWD succeeded)")
            node.is_dir = True
        finally:
            ftp.cwd(current_path)
    except ftplib.error_perm:
        # Permission denied or path not found; likely a file or inaccessible
        pass
    except Exception as exc:
        logger.debug(f"Could not verify {node.path} as directory: {exc}")


def _ensure_file_metadata(ftp: ftplib.FTP, node: FTPNode, path: str) -> None:
    """Ensure file metadata using SIZE/MDTM fallbacks when necessary."""
    if node.is_dir:
        return
    if node.size is None or node.modified is None:
        fetched_size, fetched_modified = _fetch_file_metadata(ftp, path)
        if node.size is None:
            node.size = fetched_size
        if node.modified is None:
            node.modified = fetched_modified



def _parse_modify_ts(value: str) -> datetime | None:
    """Parse RFC 3659 modify timestamp 'YYYYMMDDHHMMSS[.sss]' into UTC datetime."""
    try:
        base = value.split(".")[0]
        dt = datetime.strptime(base, "%Y%m%d%H%M%S")
        return dt.replace(tzinfo=timezone.utc)
    except (ValueError, TypeError) as exc:
        logger.debug(f"Failed to parse modify timestamp {value!r}: {exc}")
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
            logger.debug(f"Invalid size value {size_val!r}: {exc}")
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
        logger.debug(f"SIZE not permitted for {path}")
    except Exception as exc:
        logger.debug(
            f"Unexpected error running SIZE for {path}: {exc}", exc_info=True
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
        logger.debug(f"MDTM not permitted for {path}")
    except Exception as exc:
        logger.debug(
            f"Unexpected error running MDTM for {path}: {exc}", exc_info=True
        )

    if size is None and modified is None:
        logger.debug(f"No metadata available for {path} after SIZE/MDTM attempts")

    return size, modified