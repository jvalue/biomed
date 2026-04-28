"""Queue utilities for RabbitMQ integration."""

from crawler_common.queue.rabbitmq import (
    consume_download_urls,
    publish_to_queue,
)

__all__ = [
    "publish_to_queue",
    "consume_download_urls",
]
