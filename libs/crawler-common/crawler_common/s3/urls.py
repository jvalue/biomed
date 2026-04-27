"""S3 URL helper utilities."""

from urllib import parse


def build_bucket_url(endpoint_url: str, bucket_name: str) -> str:
    """Build an encoded URL for a bucket endpoint."""
    normalized_endpoint = endpoint_url.rstrip("/")
    encoded_bucket_name = parse.quote(bucket_name, safe="")
    return f"{normalized_endpoint}/{encoded_bucket_name}"


def build_object_url(endpoint_url: str, bucket_name: str, object_key: str) -> str:
    """Build an encoded URL for an object in a bucket."""
    bucket_url = build_bucket_url(endpoint_url, bucket_name)
    encoded_object_key = parse.quote(object_key, safe="/")
    return f"{bucket_url}/{encoded_object_key}"
