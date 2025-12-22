"""Shared FTP utilities for crawler apps."""

from __future__ import annotations

import ftplib
from dataclasses import dataclass, field


@dataclass
class FTPNode:
    """Represents a file or folder in the FTP structure."""

    name: str
    is_dir: bool
    path: str
    children: list["FTPNode"] = field(default_factory=list)

    def __repr__(self) -> str:  # pragma: no cover - for debugging only
        node_type = "folder" if self.is_dir else "file"
        return f"{node_type} {self.name}"


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
        ftp = ftplib.FTP(ftp_url)
        ftp.login(ftp_user, ftp_password)

        root = FTPNode(name="/", is_dir=True, path="/")
        _traverse_ftp(ftp, root, "/", depth=0, max_depth=max_depth)

        ftp.quit()
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
        ftp.cwd(current_path)

        for name, facts in ftp.mlsd():
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
        pass
    except ftplib.all_errors as exc:  # pragma: no cover - network dependent
        print(f"Error traversing {current_path}: {exc}")
