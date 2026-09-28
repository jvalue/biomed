"""RabbitMQ utilities for publishing and consuming messages."""

import json
import logging
from collections.abc import Callable
from urllib.parse import urlparse

import pika

logger = logging.getLogger(__name__)


def publish_to_queue(
    rabbitmq_url: str,
    queue_name: str,
    messages: list[dict],
) -> int:
    """
    Publish messages to a RabbitMQ queue.

    Args:
        rabbitmq_url: RabbitMQ connection URL (e.g., amqp://user:pass@host:5672/)
        queue_name: Name of the queue to publish to
        messages: List of message dictionaries to publish

    Returns:
        Number of messages successfully published
    """
    if not rabbitmq_url or not queue_name:
        logger.warning("RabbitMQ URL or queue name not configured, skipping publishing")
        return 0

    try:
        # Parse the RabbitMQ URL
        parsed_url = urlparse(rabbitmq_url)
        hostname = parsed_url.hostname or "localhost"
        port = parsed_url.port or 5672
        vhost = parsed_url.path.lstrip("/") or "/"

        logger.info(
            f"Connecting to RabbitMQ at {hostname}:{port}/{vhost} to publish to queue '{queue_name}'"
        )

        credentials = pika.PlainCredentials(
            parsed_url.username or "guest",
            parsed_url.password or "guest",
        )
        connection = pika.BlockingConnection(
            pika.ConnectionParameters(
                host=hostname,
                port=port,
                credentials=credentials,
                virtual_host=vhost,
            )
        )
        logger.debug("Successfully connected to RabbitMQ")

        channel = connection.channel()
        logger.debug(f"Declaring queue '{queue_name}' (durable=True)")
        channel.queue_declare(queue=queue_name, durable=True)

        # Publish each message
        logger.info(f"Publishing {len(messages)} messages to queue '{queue_name}'")
        published_count = 0
        for idx, message in enumerate(messages, 1):
            channel.basic_publish(
                exchange="",
                routing_key=queue_name,
                body=json.dumps(message),
                properties=pika.BasicProperties(delivery_mode=2),  # Persistent
            )
            published_count += 1
            if idx % 100 == 0:
                logger.debug(f"Published {idx}/{len(messages)} messages")

        channel.close()
        connection.close()
        logger.info(
            f"Successfully published {published_count} messages to RabbitMQ queue '{queue_name}'"
        )
        return published_count

    except pika.exceptions.AMQPConnectionError as e:
        logger.error(
            f"Failed to connect to RabbitMQ at {parsed_url.hostname}:{parsed_url.port}: {e}"
        )
        return 0
    except Exception as e:
        logger.exception(f"Error publishing to RabbitMQ queue '{queue_name}': {e}")
        return 0


def consume_download_urls(
    rabbitmq_url: str,
    queue_name: str,
    on_download_url: Callable[[str, object], None],
) -> None:
    """
    Consume download URLs from a RabbitMQ queue and process them.

    Args:
        rabbitmq_url: RabbitMQ connection URL (e.g., amqp://user:pass@host:5672/)
        queue_name: Name of the queue to consume from
        on_download_url: Callback function to process each download URL

    Raises:
        Exception: If connection or consumption fails
    """
    try:
        # Parse the RabbitMQ URL
        parsed_url = urlparse(rabbitmq_url)
        hostname = parsed_url.hostname or "localhost"
        port = parsed_url.port or 5672
        vhost = parsed_url.path.lstrip("/") or "/"

        logger.info(
            f"Connecting to RabbitMQ at {hostname}:{port}/{vhost} to consume from queue '{queue_name}'"
        )

        credentials = pika.PlainCredentials(
            parsed_url.username or "guest",
            parsed_url.password or "guest",
        )
        connection = pika.BlockingConnection(
            pika.ConnectionParameters(
                host=hostname,
                port=port,
                credentials=credentials,
                virtual_host=vhost,
                heartbeat=0,
                blocked_connection_timeout=300,
            )
        )
        logger.debug("Successfully connected to RabbitMQ")

        channel = connection.channel()
        logger.debug(f"Declaring queue '{queue_name}' (durable=True)")
        channel.queue_declare(queue=queue_name, durable=True)
        channel.basic_qos(prefetch_count=1)  # Process one message at a time
        logger.debug("Set prefetch count to 1 (sequential processing)")

        message_count = 0

        def callback(ch, method, properties, body: bytes) -> None:
            """Process a message from the queue."""
            nonlocal message_count
            message_count += 1

            try:
                message = json.loads(body.decode("utf-8"))
                download_url = message.get("url")
                ftp_run_id = message.get("ftp_run_id", None)

                if not download_url:
                    logger.warning(
                        f"Received message #{message_count} without 'url' field: {message}"
                    )
                    ch.basic_ack(delivery_tag=method.delivery_tag)
                    return

                logger.info(
                    f"Message #{message_count}: Processing download URL from FTP run {ftp_run_id}: {download_url}"
                )
                on_download_url(download_url, ftp_run_id)
                logger.debug(
                    f"Message #{message_count}: Successfully processed: {download_url}"
                )
                ch.basic_ack(delivery_tag=method.delivery_tag)

            except json.JSONDecodeError as e:
                logger.error(
                    f"Message #{message_count}: Failed to decode JSON message: {e}, body={body[:100]}"
                )
                ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
            except Exception as e:
                logger.exception(
                    f"Message #{message_count}: Error processing message, requeuing: {e}"
                )
                ch.basic_nack(delivery_tag=method.delivery_tag, requeue=True)

        channel.basic_consume(queue=queue_name, on_message_callback=callback)

        logger.info(
            f"Starting consumer for queue '{queue_name}' (waiting for messages...)"
        )
        channel.start_consuming()

    except pika.exceptions.AMQPConnectionError as e:
        logger.error(f"Failed to connect to RabbitMQ at {hostname}:{port}: {e}")
        raise
    except KeyboardInterrupt:
        logger.info("Consumer interrupted by user (Ctrl+C)")
        raise
    except Exception as e:
        logger.exception(f"Error consuming from RabbitMQ queue '{queue_name}': {e}")
        raise
