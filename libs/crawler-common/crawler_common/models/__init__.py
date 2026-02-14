"""Model package for crawler common types."""

from crawler_common.models.api import CrawlRequest, CrawlResponse
from crawler_common.models.db import Base, FTPDiscoveryEntry, FTPDiscoveryRun
from crawler_common.models.protocols import FTPNodeProtocol

__all__ = [
    "Base",
    "CrawlRequest",
    "CrawlResponse",
    "FTPDiscoveryEntry",
    "FTPDiscoveryRun",
    "FTPNodeProtocol",
]
