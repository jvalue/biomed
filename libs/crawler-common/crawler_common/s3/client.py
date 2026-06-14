"""S3 client factory utilities."""

import os
from typing import TYPE_CHECKING, cast

import boto3
from botocore import UNSIGNED
from botocore.client import Config

if TYPE_CHECKING:
    from mypy_boto3_s3.client import S3Client


def create_s3_client(endpoint_url: str, timeout_seconds: int) -> "S3Client":
    """Create an S3 client configured for local endpoints and cloud usage."""
    access_key_id = os.getenv("AWS_ACCESS_KEY_ID")
    secret_access_key = os.getenv("AWS_SECRET_ACCESS_KEY")
    session_token = os.getenv("AWS_SESSION_TOKEN")
    region_name = os.getenv("AWS_REGION") or os.getenv("AWS_DEFAULT_REGION") or "eu-central-1"

    if not access_key_id and not secret_access_key:
        config = Config(
            connect_timeout=timeout_seconds,
            read_timeout=timeout_seconds,
            s3={"addressing_style": "path"},
            signature_version=UNSIGNED,
        )
    else:
        config = Config(
            connect_timeout=timeout_seconds,
            read_timeout=timeout_seconds,
            s3={"addressing_style": "path"},
            signature_version="s3v4",
        )

    if access_key_id and secret_access_key:
        return cast(
            "S3Client",
            boto3.client(
                "s3",
                endpoint_url=endpoint_url,
                config=config,
                region_name=region_name,
                aws_access_key_id=access_key_id,
                aws_secret_access_key=secret_access_key,
                aws_session_token=session_token,
            ),
        )

    return cast(
        "S3Client",
        boto3.client(
            "s3",
            endpoint_url=endpoint_url,
            config=config,
            region_name=region_name,
        ),
    )
