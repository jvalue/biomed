"""RabbitMQ queue helpers for download URL workflows."""

from __future__ import annotations

import json
import logging
from collections.abc import Callable, Iterable
from typing import Any

import pika

logger = logging.getLogger(__name__)


def publish_download_urls(
    rabbitmq_url: str,
    queue_name: str,
    download_urls: Iterable[str],
) -> int:
    """Publish download URLs to a durable RabbitMQ queue.

    Returns the number of published messages.
    """
    parameters = pika.URLParameters(rabbitmq_url)
    connection = pika.BlockingConnection(parameters)

    published = 0
    try:
        channel = connection.channel()
        channel.queue_declare(queue=queue_name, durable=True)

        for download_url in download_urls:
            payload = json.dumps({"download_url": download_url})
            channel.basic_publish(
                exchange="",
                routing_key=queue_name,
                body=payload.encode("utf-8"),
                properties=pika.BasicProperties(delivery_mode=2),
            )
            published += 1
    finally:
        connection.close()

    return published


def consume_download_urls(
    rabbitmq_url: str,
    queue_name: str,
    on_download_url: Callable[[str], None],
) -> None:
    """Consume download URLs from a durable RabbitMQ queue forever."""
    parameters = pika.URLParameters(rabbitmq_url)
    connection = pika.BlockingConnection(parameters)

    channel = connection.channel()
    channel.queue_declare(queue=queue_name, durable=True)
    channel.basic_qos(prefetch_count=1)

    def callback(
        ch: Any,
        method: Any,
        _properties: Any,
        body: bytes,
    ) -> None:
        try:
            message = json.loads(body.decode("utf-8"))
            download_url = str(message["download_url"])
            on_download_url(download_url)
            ch.basic_ack(delivery_tag=method.delivery_tag)
        except Exception:
            logger.exception("Failed to process queue message")
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=True)

    channel.basic_consume(queue=queue_name, on_message_callback=callback)
    try:
        channel.start_consuming()
    finally:
        connection.close()
