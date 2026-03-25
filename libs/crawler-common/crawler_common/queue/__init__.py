"""Queue utilities for crawler apps."""

from crawler_common.queue.rabbitmq import consume_download_urls, publish_download_urls

__all__ = ["publish_download_urls", "consume_download_urls"]
