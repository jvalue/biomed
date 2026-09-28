"""Queue utilities for RabbitMQ integration."""

from crawler_common.queue.rabbitmq import (
    consume_download_urls,
    publish_to_queue,
)

__all__ = [
    "consume_download_urls",
    "publish_to_queue",
]
