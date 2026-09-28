"""S3 object operations."""

from pathlib import Path

from botocore.exceptions import BotoCoreError, ClientError, EndpointConnectionError

from crawler_common.s3.client import create_s3_client


def upload_and_verify_test_object(
    endpoint_url: str,
    bucket_name: str,
    object_key: str,
    payload: bytes,
    timeout_seconds: int,
) -> bool:
    """Upload a test object and verify it can be read back."""
    client = create_s3_client(
        endpoint_url=endpoint_url, timeout_seconds=timeout_seconds
    )

    try:
        client.put_object(
            Bucket=bucket_name,
            Key=object_key,
            Body=payload,
            ContentType="text/plain; charset=utf-8",
        )

        get_response = client.get_object(Bucket=bucket_name, Key=object_key)
        downloaded_payload = get_response["Body"].read()
        if downloaded_payload != payload:
            return False
    except (ClientError, EndpointConnectionError, BotoCoreError):
        return False

    return True


def download_test_object(
    endpoint_url: str,
    bucket_name: str,
    object_key: str,
    destination_path: Path,
    timeout_seconds: int,
) -> bool:
    """Download an object from S3 and store it on disk."""
    client = create_s3_client(
        endpoint_url=endpoint_url, timeout_seconds=timeout_seconds
    )

    try:
        get_response = client.get_object(Bucket=bucket_name, Key=object_key)
        payload = get_response["Body"].read()
    except (ClientError, EndpointConnectionError, BotoCoreError):
        return False

    destination_path.parent.mkdir(parents=True, exist_ok=True)
    destination_path.write_bytes(payload)
    return True
