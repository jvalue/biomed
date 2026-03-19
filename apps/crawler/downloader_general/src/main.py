import logging
import os
import sys
from datetime import UTC, datetime
from pathlib import Path

from crawler_common.s3 import (
    can_connect_to_bucket,
    download_test_object,
    upload_and_verify_test_object,
)


logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


def main() -> None:
    """Try connecting to the configured S3 bucket and exit immediately."""
    endpoint_url = os.getenv("S3_ENDPOINT_URL", "http://localhost:9000")
    bucket_name = os.getenv("S3_BUCKET", "biomed-data")
    timeout_seconds = int(os.getenv("S3_CONNECT_TIMEOUT_SECONDS", "5"))
    object_key = os.getenv("S3_TEST_OBJECT_KEY", "crawler-dummy/connection-test.txt")
    download_path = Path(
        os.getenv("S3_DOWNLOAD_DESTINATION", "/tmp/crawler-dummy-download.txt")
    )
    object_text = os.getenv(
        "S3_TEST_OBJECT_TEXT",
        f"crawler_dummy upload test at {datetime.now(UTC).isoformat()}",
    )
    object_payload = object_text.encode("utf-8")

    if not can_connect_to_bucket(endpoint_url, bucket_name, timeout_seconds):
        logger.error(f"Failed to connect to bucket '{bucket_name}' at '{endpoint_url}'")
        sys.exit(1)

    logger.info(f"Successfully reached bucket '{bucket_name}' at '{endpoint_url}'")

    if upload_and_verify_test_object(
        endpoint_url,
        bucket_name,
        object_key,
        object_payload,
        timeout_seconds,
    ):
        logger.info(f"Successfully uploaded and verified object '{object_key}'")
    else:
        logger.error(f"Failed to upload and verify object '{object_key}'")
        sys.exit(1)

    if download_test_object(
        endpoint_url,
        bucket_name,
        object_key,
        download_path,
        timeout_seconds,
    ):
        logger.info(f"Successfully downloaded object to '{download_path}'")
        return

    logger.error(f"Failed to download object '{object_key}' to '{download_path}'")
    sys.exit(1)


if __name__ == "__main__":
    main()


