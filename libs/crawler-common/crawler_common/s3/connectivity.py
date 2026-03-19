"""S3 connectivity checks."""

from botocore.exceptions import BotoCoreError, ClientError, EndpointConnectionError

from crawler_common.s3.client import create_s3_client


def can_connect_to_bucket(endpoint_url: str, bucket_name: str, timeout_seconds: int) -> bool:
    """Check whether an S3 bucket endpoint is reachable via head_bucket."""
    client = create_s3_client(endpoint_url=endpoint_url, timeout_seconds=timeout_seconds)

    try:
        client.head_bucket(Bucket=bucket_name)
        return True
    except ClientError as client_error:
        error_code = str(client_error.response.get("Error", {}).get("Code", ""))
        return error_code in {"400", "403", "404", "AccessDenied", "NoSuchBucket"}
    except (EndpointConnectionError, BotoCoreError):
        return False
