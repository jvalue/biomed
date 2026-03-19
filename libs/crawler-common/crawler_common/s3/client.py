"""S3 client factory utilities."""

import os

import boto3
from botocore import UNSIGNED
from botocore.client import BaseClient, Config


def create_s3_client(endpoint_url: str, timeout_seconds: int) -> BaseClient:
    """Create an S3 client configured for local endpoints and cloud usage."""
    access_key_id = os.getenv("AWS_ACCESS_KEY_ID")
    secret_access_key = os.getenv("AWS_SECRET_ACCESS_KEY")
    session_token = os.getenv("AWS_SESSION_TOKEN")
    region_name = os.getenv("AWS_REGION") or os.getenv("AWS_DEFAULT_REGION")

    config_kwargs: dict[str, object] = {
        "connect_timeout": timeout_seconds,
        "read_timeout": timeout_seconds,
        "s3": {"addressing_style": "path"},
    }

    if not access_key_id and not secret_access_key:
        config_kwargs["signature_version"] = UNSIGNED

    client_kwargs: dict[str, object] = {
        "service_name": "s3",
        "endpoint_url": endpoint_url,
        "config": Config(**config_kwargs),
    }

    if region_name:
        client_kwargs["region_name"] = region_name

    if access_key_id and secret_access_key:
        client_kwargs["aws_access_key_id"] = access_key_id
        client_kwargs["aws_secret_access_key"] = secret_access_key
        if session_token:
            client_kwargs["aws_session_token"] = session_token

    return boto3.client(**client_kwargs)
