import asyncio
import logging
import os
import time
from datetime import datetime, timezone
from pathlib import Path

import httpx
from crawler_common.http_client import HttpClient
from dotenv import load_dotenv


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


def _load_local_env() -> None:
    """Load local .env file for development if present.

    In Kubernetes, environment variables are injected directly from Secrets and
    therefore this optional file is typically not used.
    """

    env_path = Path(__file__).parent.parent / ".env"
    load_dotenv(dotenv_path=env_path)


async def _notify_management_backend() -> None:
    """Send a simple authenticated request to the management backend."""

    run_namespace = os.getenv(
        "CRAWLER_RUN_NAMESPACE",
        os.getenv("CRAWLER_DUMMY_RUN_NAMESPACE", "default"),
    )
    run_name = os.getenv(
        "CRAWLER_RUN_NAME",
        os.getenv("CRAWLER_DUMMY_RUN_NAME", "crawler-dummy"),
    )
    base_url = os.getenv("MANAGEMENT_BACKEND_URL", "<missing MANAGEMENT_BACKEND_URL>")
    endpoint = os.getenv(
        "CRAWLER_DUMMY_ENDPOINT",
        f"/api/v1/crawler-runs/{run_namespace}/{run_name}/events",
    )
    method = os.getenv("CRAWLER_DUMMY_METHOD", "POST").upper()
    target_url = f"{base_url.rstrip('/')}{endpoint if endpoint.startswith('/') else f'/{endpoint}'}"
    logger.info(f"Calling management backend endpoint: {method} {target_url}")

    client = HttpClient(timeout=10)
    payload = {
        "type": "INFO",
        "message": "crawler_dummy startup ping",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    # Send a payload only for methods that typically support request bodies.
    json_body = payload if method not in {"GET", "DELETE"} else None

    response = await client.call_management_endpoint_from_env(
        endpoint=endpoint,
        method=method,
        json_body=json_body,
    )
    logger.info(f"Management backend call successful ({method} {endpoint}): {response.status_code}")


def main():
    _load_local_env()

    try:
        asyncio.run(_notify_management_backend())
    except ValueError as error:
        logger.warning(f"Skipping management backend call due to missing env config: {error}")
    except httpx.HTTPError as error:
        logger.error(f"Management backend call failed: {error}")

    with open("progress.txt", "w") as f:
        for i in range(1, 101):
            f.write(f"{i}\n")
            f.flush()
            print(f"Progress: {i}/100")
            time.sleep(1)


if __name__ == "__main__":
    main()
