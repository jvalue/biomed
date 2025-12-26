"""Shared FTP utilities for crawler apps."""

from __future__ import annotations

import ftplib
import logging

from crawler_common.ftp_node import FTPNode

logger = logging.getLogger(__name__)


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
        ftp = ftplib.FTP(ftp_url)
        ftp.login(ftp_user, ftp_password)

        root = FTPNode(name="/", is_dir=True, path="/")
        _traverse_ftp(ftp, root, "/", depth=0, max_depth=max_depth)

        ftp.quit()
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
            parent.children.append(node)

            if is_dir and depth < max_depth - 1:
                _traverse_ftp(ftp, node, path, depth + 1, max_depth)
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

        file.write(f"{prefix}{connector}{name}\n")

        if child.is_dir and child.children:
            extension = "    " if is_last else "│   "
            _write_tree(child, file, prefix + extension)
