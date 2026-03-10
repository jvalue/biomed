"""Compatibility wrapper for the crawler_general entrypoint."""

from .src import main as _main_module

main = _main_module.main
ftp_conf = _main_module.ftp_conf
ftp_tools = _main_module.ftp_tools

__all__ = ["main", "ftp_conf", "ftp_tools"]
