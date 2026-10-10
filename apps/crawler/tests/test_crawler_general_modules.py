"""Unit tests for crawler_general modular components (urls, diff, config, publisher)."""

from datetime import UTC, datetime, timedelta
from unittest.mock import MagicMock

from crawler_common.ftp.ftp_node import FTPNode
from crawler_common.models.db import FTPDiscoveryEntry
from crawler_general.src.config import CrawlerConfig, derive_crawl_db_name
from crawler_general.src.diff import entry_has_changed
from crawler_general.src.publisher import build_queue_messages, flush_discovery_batch
from crawler_general.src.urls import build_download_url


def test_build_download_url_basic():
    """Ensure build_download_url builds basic relative download paths."""
    base_url = "https://ftp.example.com/data/"
    assert (
        build_download_url(base_url, "/data/file.xml")
        == "https://ftp.example.com/data/file.xml"
    )
    assert (
        build_download_url("https://ftp.example.com/data", "/data/sub/file.xml")
        == "https://ftp.example.com/data/sub/file.xml"
    )


def test_build_download_url_root_and_nested():
    """Ensure root path normalization and nested path handling without duplication."""
    base_url = "ftp://ftp.ncbi.nlm.nih.gov/pub/pmc/"
    assert (
        build_download_url(base_url, "/pub/pmc/articles.tar.gz")
        == "ftp://ftp.ncbi.nlm.nih.gov/pub/pmc/articles.tar.gz"
    )
    # When base URL is root domain
    root_base = "ftp://ftp.example.com"
    assert (
        build_download_url(root_base, "/folder/file.csv")
        == "ftp://ftp.example.com/folder/file.csv"
    )
    # When node path equals the root prefix exactly
    assert build_download_url(base_url, "/pub/pmc") == base_url


def test_derive_crawl_db_name():
    """Ensure derive_crawl_db_name uses explicit name or sanitizes candidate URL."""
    assert derive_crawl_db_name("ftp://ftp.example.com", "custom-db") == "custom-db"
    assert (
        derive_crawl_db_name("ftp://ftp.ncbi.nlm.nih.gov/genomes")
        == "ftp-ncbi-nlm-nih-gov"
    )
    assert derive_crawl_db_name("invalid url :::") == "invalid-url"
    assert derive_crawl_db_name("") == "crawl"


def test_crawler_config_defaults():
    """Ensure CrawlerConfig populates default batch size and tolerance."""
    config = CrawlerConfig(
        ftp_url="ftp://ftp.example.com",
        ftp_user="user",
        ftp_password="pass",
        ftp_max_depth=3,
        rabbitmq_url="",
        rabbitmq_queue="download-urls",
        crawl_db_name="test-db",
        database_url="sqlite:///:memory:",
    )
    assert config.batch_size == 500
    assert config.tolerance_seconds == 60


def test_entry_has_changed():
    """Ensure delta detection correctly compares size, type, and timestamp jitter."""
    node = FTPNode(name="file.txt", is_dir=False, path="/file.txt", size=100)
    now = datetime(2026, 1, 1, 12, 0, 0, tzinfo=UTC)

    curr = FTPDiscoveryEntry.from_ftp_node(node, run_id=1, depth=1)
    curr.modified = now

    # Brand new entry
    assert entry_has_changed(curr, None) is True

    # Identical previous entry
    prev_same = FTPDiscoveryEntry.from_ftp_node(node, run_id=1, depth=1)
    prev_same.modified = now
    assert entry_has_changed(curr, prev_same) is False

    # Directory status change
    prev_dir = FTPDiscoveryEntry.from_ftp_node(node, run_id=1, depth=1)
    prev_dir.is_dir = True
    assert entry_has_changed(curr, prev_dir) is True

    # Size change
    prev_diff_size = FTPDiscoveryEntry.from_ftp_node(node, run_id=1, depth=1)
    prev_diff_size.size = 200
    prev_diff_size.modified = now
    assert entry_has_changed(curr, prev_diff_size) is True

    # Timestamp within 60s tolerance (FTP jitter)
    prev_jitter = FTPDiscoveryEntry.from_ftp_node(node, run_id=1, depth=1)
    prev_jitter.modified = now - timedelta(seconds=30)
    assert entry_has_changed(curr, prev_jitter, tolerance_seconds=60) is False

    # Timestamp outside tolerance
    prev_old = FTPDiscoveryEntry.from_ftp_node(node, run_id=1, depth=1)
    prev_old.modified = now - timedelta(seconds=90)
    assert entry_has_changed(curr, prev_old, tolerance_seconds=60) is True

    # One modified is None and the other is not
    prev_none = FTPDiscoveryEntry.from_ftp_node(node, run_id=1, depth=1)
    prev_none.modified = None
    assert entry_has_changed(curr, prev_none) is True

    # Both modified are None
    curr_none = FTPDiscoveryEntry.from_ftp_node(node, run_id=1, depth=1)
    curr_none.modified = None
    assert entry_has_changed(curr_none, prev_none) is False


def test_build_queue_messages():
    """Ensure message building formats RabbitMQ task payload."""
    node = FTPNode(name="data.xml", is_dir=False, path="/data.xml")
    entry = FTPDiscoveryEntry.from_ftp_node(node, run_id=42, depth=1)

    items = [(entry, "https://ftp.example.com/data.xml")]
    messages = build_queue_messages(items, crawl_db_name="test-db")

    assert len(messages) == 1
    assert messages[0] == {
        "url": "https://ftp.example.com/data.xml",
        "ftp_run_id": 42,
        "db_name": "test-db",
    }


def test_flush_discovery_batch_empty():
    """Ensure flushing an empty batch is a no-op."""
    session = MagicMock()
    batch = []
    inserted, published, skipped = flush_discovery_batch(
        session=session,
        rabbitmq_url="",
        rabbitmq_queue="",
        batch=batch,
    )
    assert (inserted, published, skipped) == (0, 0, 0)
    assert not session.commit.called
