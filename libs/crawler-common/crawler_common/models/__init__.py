"""Model package for crawler common types."""

from crawler_common.models.api import CrawlRequest, CrawlResponse
from crawler_common.models.db import Base, FTPDiscoveryEntry, FTPDiscoveryRun

__all__ = [
    "Base",
    "CrawlRequest",
    "CrawlResponse",
    "FTPDiscoveryEntry",
    "FTPDiscoveryRun",
]
