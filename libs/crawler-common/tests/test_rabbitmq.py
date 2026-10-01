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


def test_consume_download_urls_does_not_retry_on_internal_type_error(monkeypatch):
    """Ensure internal TypeError in a valid 3-arg callback is not caught and retried with 2 args."""

    class FakeChannel:
        def __init__(self):
            self.nacked = []

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
            pass

        def basic_nack(self, delivery_tag, requeue):
            self.nacked.append((delivery_tag, requeue))

    fake_channel = FakeChannel()

    class FakeConnection:
        def __init__(self, *_args, **_kwargs):
            self.channel_obj = fake_channel

        def channel(self):
            return self.channel_obj

        def close(self):
            pass

    monkeypatch.setattr("pika.BlockingConnection", FakeConnection)

    call_count = 0

    def buggy_3_arg_callback(url, run_id, db_name):
        nonlocal call_count
        call_count += 1
        # Raise an internal TypeError
        raise TypeError("internal bug: unsupported operand type(s)")

    consume_download_urls(
        "amqp://guest:guest@localhost:5672/",
        "test-queue",
        buggy_3_arg_callback,
    )

    # Must only be called once (no duplicate execution/retry with 2 args)
    assert call_count == 1
    # Message must be nack'd and requeued
    assert fake_channel.nacked == [(1, True)]

