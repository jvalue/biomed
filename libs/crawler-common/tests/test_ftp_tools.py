from __future__ import annotations

import ftplib

from crawler_common.ftp.ftp_node import FTPNode
from crawler_common.ftp.ftp_tools import _verify_is_dir


class FakeFTP:
    def __init__(self) -> None:
        self.cwd_calls: list[str] = []
        self._pwd = "/parent"

    def pwd(self) -> str:
        return self._pwd

    def cwd(self, path: str) -> None:
        self.cwd_calls.append(path)
        if path == "/parent":
            self._pwd = path
            return
        if path == "/parent/file.txt":
            raise ftplib.error_perm("550 Not a directory")
        if path == "/parent/folder":
            self._pwd = path
            return
        raise ftplib.error_perm("550 Not found")


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
