from __future__ import annotations

import ftplib

from crawler_common.ftp.ftp_node import FTPNode
from crawler_common.ftp.ftp_tools import _verify_is_dir


class FakeFTP:
    def __init__(self) -> None:
        self.cwd_calls: list[str] = []
        self.nlst_paths: list[str] = []
        self._pwd = "/parent"

    def pwd(self) -> str:
        return self._pwd

    def cwd(self, path: str) -> None:
        self.cwd_calls.append(path)
        if not path.startswith("/"):
            path = f"{self._pwd.rstrip('/')}/{path}"
        if path == "/parent":
            self._pwd = path
            return
        if path == "/parent/file.txt":
            raise ftplib.error_perm("550 Not a directory")
        if path == "/parent/folder":
            self._pwd = path
            return
        raise ftplib.error_perm("550 Not found")

    def nlst(self) -> list[str]:
        self.nlst_paths.append(self._pwd)
        if self._pwd == "/parent":
            return ["file.txt", "folder"]

        if self._pwd == "/wrong":
            return ["wrong.txt"]

        return []


def test_verify_is_dir_does_not_promote_files() -> None:
    ftp = FakeFTP()
    node = FTPNode(name="file.txt", is_dir=False, path="/parent/file.txt")

    _verify_is_dir(ftp, node)

    assert node.is_dir is False
    assert ftp.cwd_calls == ["/parent/file.txt", "/parent"]


def test_verify_is_dir_promotes_directories() -> None:
    ftp = FakeFTP()
    node = FTPNode(name="folder", is_dir=False, path="/parent/folder")

    _verify_is_dir(ftp, node)

    assert node.is_dir is True
    assert ftp.cwd_calls == ["/parent/folder", "/parent"]


def test_nlst_fallback_anchors_to_requested_path() -> None:
    from crawler_common.ftp.ftp_tools import _nlst_fallback

    class DriftedFTP(FakeFTP):
        def __init__(self) -> None:
            super().__init__()
            self._pwd = "/wrong"

        def cwd(self, path: str) -> None:
            self.cwd_calls.append(path)
            if path == "/parent":
                self._pwd = path
                return
            if path == "/wrong":
                self._pwd = path
                return
            if path == "/parent/folder":
                self._pwd = path
                return
            raise ftplib.error_perm("550 Not found")

    ftp = DriftedFTP()

    entries = _nlst_fallback(ftp, "/parent")

    assert [name for name, _facts in entries] == ["file.txt", "folder"]
    assert ftp.nlst_paths == ["/parent"]
