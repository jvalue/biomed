"""Tests for RabbitMQ queue helpers."""

import json
from crawler_common.queue.rabbitmq import consume_download_urls


def test_consume_download_urls_passes_db_name(monkeypatch):
    """Ensure consume_download_urls extracts db_name and passes it to callbacks."""

    class FakeChannel:
        def queue_declare(self, **_kwargs):
            pass

        def basic_qos(self, **_kwargs):
            pass

        def basic_consume(self, queue, on_message_callback):
            self.callback = on_message_callback

        def start_consuming(self):
            # Simulate a message with db_name
            class FakeMethod:
                delivery_tag = 1

            body = json.dumps(
                {
                    "url": "https://example.com/data.xml",
                    "ftp_run_id": 42,
                    "db_name": "bioproject",
                }
            ).encode("utf-8")
            self.callback(self, FakeMethod(), None, body)

        def basic_ack(self, delivery_tag):
            self.acked = delivery_tag

    class FakeConnection:
        def __init__(self, *_args, **_kwargs):
            self.channel_obj = FakeChannel()

        def channel(self):
            return self.channel_obj

        def close(self):
            pass

    monkeypatch.setattr("pika.BlockingConnection", FakeConnection)

    received = []

    def callback_3_args(url, run_id, db_name):
        received.append((url, run_id, db_name))

    consume_download_urls(
        "amqp://guest:guest@localhost:5672/",
        "test-queue",
        callback_3_args,
    )

    assert received == [("https://example.com/data.xml", 42, "bioproject")]


def test_consume_download_urls_supports_legacy_2_arg_callback(monkeypatch):
    """Ensure callbacks that only accept 2 args still work without raising TypeError."""

    class FakeChannel:
        def queue_declare(self, **_kwargs):
            pass

        def basic_qos(self, **_kwargs):
            pass

        def basic_consume(self, queue, on_message_callback):
            self.callback = on_message_callback

        def start_consuming(self):
            class FakeMethod:
                delivery_tag = 1

            body = json.dumps(
                {
                    "url": "https://example.com/data.xml",
                    "ftp_run_id": 42,
                    "db_name": "clinvar",
                }
            ).encode("utf-8")
            self.callback(self, FakeMethod(), None, body)

        def basic_ack(self, delivery_tag):
            self.acked = delivery_tag

    class FakeConnection:
        def __init__(self, *_args, **_kwargs):
            self.channel_obj = FakeChannel()

        def channel(self):
            return self.channel_obj

        def close(self):
            pass

    monkeypatch.setattr("pika.BlockingConnection", FakeConnection)

    received = []

    def callback_2_args(url, run_id):
        received.append((url, run_id))

    consume_download_urls(
        "amqp://guest:guest@localhost:5672/",
        "test-queue",
        callback_2_args,
    )

    assert received == [("https://example.com/data.xml", 42)]
