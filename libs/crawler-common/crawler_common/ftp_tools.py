"""Shared FTP utilities for crawler apps."""

from __future__ import annotations

import ftplib
import logging
from datetime import datetime, timezone

from crawler_common.ftp_node import FTPNode

logger = logging.getLogger(__name__)
_truncated_due_to_depth = False


def get_root_folders(ftp_url: str, ftp_user: str, ftp_password: str) -> list[str]:
    """Connect to FTP server and retrieve root folder names."""

    folders: list[str] = []
    try:
        ftp = ftplib.FTP(ftp_url)
        ftp.login(ftp_user, ftp_password)

        # Prefer MLSD for structured directory info
        try:
            for name, facts in ftp.mlsd():
                if facts.get("type") == "dir" and name not in {".", ".."}:
                    folders.append(name)
        except ftplib.error_perm:
            # MLSD not supported, fall back to parsing LIST output
            def parse_list_line(line: str) -> None:
                if line.startswith("d"):
                    folders.append(line.split()[-1])

            ftp.retrlines("LIST", parse_list_line)

        ftp.quit()
    except ftplib.all_errors as exc:  # pragma: no cover - network dependent
        print(f"FTP error: {exc}")
        raise

    return folders


def get_ftp_structure(
    ftp_url: str,
    ftp_user: str,
    ftp_password: str,
    max_depth: int = 3,
) -> FTPNode:
    """Recursively retrieve the FTP directory structure up to ``max_depth``."""

    try:
        logger.info(f"Connecting to FTP server: {ftp_url}")
        logger.info(f"Starting traversal with max_depth={max_depth}")
        global _truncated_due_to_depth
        _truncated_due_to_depth = False
        ftp = ftplib.FTP(ftp_url)
        ftp.login(ftp_user, ftp_password)

        root = FTPNode(name="/", is_dir=True, path="/")
        _traverse_ftp(ftp, root, "/", depth=0, max_depth=max_depth)

        ftp.quit()
        if _truncated_due_to_depth:
            logger.warning(
                "Traversal reached max_depth; deeper paths were not explored."
            )
        logger.info("FTP traversal completed")
        return root
    except ftplib.all_errors as exc:  # pragma: no cover - network dependent
        print(f"FTP error: {exc}")
        raise


def _traverse_ftp(
    ftp: ftplib.FTP,
    parent: FTPNode,
    current_path: str,
    depth: int,
    max_depth: int,
) -> None:
    """Recursively traverse FTP directory structure."""

    if depth >= max_depth:
        return

    try:
        logger.info(f"Traversing: {current_path} (depth {depth}/{max_depth})")
        ftp.cwd(current_path)

        entries = list(ftp.mlsd())
        logger.debug(f"Found {len(entries)} entries in {current_path}")

        for name, facts in entries:
            if name in {".", ".."}:
                continue

            is_dir = facts.get("type") == "dir"
            path = f"{current_path.rstrip('/')}/{name}"
            node = FTPNode(name=name, is_dir=is_dir, path=path)
            # Populate metadata from MLSD facts
            f_size, f_modified = _extract_metadata_from_facts(facts)
            node.size = f_size
            node.modified = f_modified

            # Fallbacks for files when facts are missing
            if not is_dir and (node.size is None or node.modified is None):
                fetched_size, fetched_modified = _fetch_file_metadata(ftp, path)
                if node.size is None:
                    node.size = fetched_size
                if node.modified is None:
                    node.modified = fetched_modified
            parent.children.append(node)

            if is_dir and depth < max_depth - 1:
                _traverse_ftp(ftp, node, path, depth + 1, max_depth)
            elif is_dir and depth >= max_depth - 1:
                # We found a directory at the boundary; deeper content won't be crawled
                global _truncated_due_to_depth
                _truncated_due_to_depth = True
                logger.debug(f"Max depth reached at {path}; not descending further")
    except ftplib.error_perm:
        # Skip directories without permission
        logger.warning(f"Permission denied: {current_path}")
        pass
    except ftplib.all_errors as exc:  # pragma: no cover - network dependent
        print(f"Error traversing {current_path}: {exc}")


def write_ftp_structure_to_file(root: FTPNode, output_path: str) -> None:
    """Write FTP directory structure to a text file in tree format."""

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(f"{root.name}\n")
        _write_tree(root, f, prefix="")


def _write_tree(node: FTPNode, file, prefix: str) -> None:
    """Recursively write tree structure with proper formatting."""

    children = node.children
    for i, child in enumerate(children):
        is_last = i == len(children) - 1
        connector = "└── " if is_last else "├── "
        name = f"{child.name}/" if child.is_dir else child.name
        meta_parts: list[str] = []
        # Only include size for files, not directories
        if (not child.is_dir) and (child.size is not None):
            meta_parts.append(f"size={child.size}")
        if child.modified is not None:
            # ISO-like UTC formatting
            meta_parts.append(f"modified={child.modified.astimezone(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')}")
        meta = f" ({', '.join(meta_parts)})" if meta_parts else ""

        file.write(f"{prefix}{connector}{name}{meta}\n")

        if child.is_dir and child.children:
            extension = "    " if is_last else "│   "
            _write_tree(child, file, prefix + extension)


def _parse_modify_ts(value: str) -> datetime | None:
    """Parse RFC 3659 modify timestamp 'YYYYMMDDHHMMSS[.sss]' into UTC datetime."""
    try:
        base = value.split(".")[0]
        dt = datetime.strptime(base, "%Y%m%d%H%M%S")
        return dt.replace(tzinfo=timezone.utc)
    except Exception:
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
        except Exception:
            size = None

    modify_val = facts.get("modify")
    if modify_val:
        modified = _parse_modify_ts(modify_val)

    return size, modified


def _fetch_file_metadata(ftp: ftplib.FTP, path: str) -> tuple[int | None, datetime | None]:
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
        pass
    except Exception:
        pass

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
        pass
    except Exception:
        pass

    return size, modified
