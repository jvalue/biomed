from __future__ import annotations

import boto3
from botocore import UNSIGNED
from crawler_common.s3.client import create_s3_client


def test_create_s3_client_defaults_region_and_signature(monkeypatch):
    captured = {}

    def fake_client(service_name, **kwargs):
        captured.update(kwargs)
        return object()

    monkeypatch.delenv("AWS_REGION", raising=False)
    monkeypatch.delenv("AWS_DEFAULT_REGION", raising=False)
    monkeypatch.delenv("AWS_ACCESS_KEY_ID", raising=False)
    monkeypatch.delenv("AWS_SECRET_ACCESS_KEY", raising=False)
    monkeypatch.setattr(boto3, "client", fake_client)

    client = create_s3_client(
        endpoint_url="http://minio.local:9000", timeout_seconds=30
    )

    assert client is not None
    assert captured["region_name"] == "eu-central-1"
    assert captured["config"].signature_version == UNSIGNED


def test_create_s3_client_uses_s3v4_when_credentials_are_present(monkeypatch):
    captured = {}

    def fake_client(service_name, **kwargs):
        captured.update(kwargs)
        return object()

    monkeypatch.setenv("AWS_ACCESS_KEY_ID", "minioadmin")
    monkeypatch.setenv("AWS_SECRET_ACCESS_KEY", "minioadmin")
    monkeypatch.delenv("AWS_REGION", raising=False)
    monkeypatch.delenv("AWS_DEFAULT_REGION", raising=False)
    monkeypatch.setattr(boto3, "client", fake_client)

    create_s3_client(endpoint_url="http://minio.local:9000", timeout_seconds=30)

    assert captured["region_name"] == "eu-central-1"
    assert captured["config"].signature_version == "s3v4"
