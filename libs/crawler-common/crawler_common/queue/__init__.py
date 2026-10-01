"""Queue utilities for RabbitMQ integration."""

from crawler_common.queue.rabbitmq import (
    DownloadCallback,
    consume_download_urls,
    publish_to_queue,
)

__all__ = [
    "DownloadCallback",
    "consume_download_urls",
    "publish_to_queue",
]
