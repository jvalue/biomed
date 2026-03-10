import asyncio
import logging
import os
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


def _resolve_metrics_interval() -> int:
    """Resolve metrics report interval from env with a safe fallback."""

    raw_value = os.getenv("CRAWLER_DUMMY_METRICS_EVERY", "10")
    try:
        return max(1, int(raw_value))
    except ValueError:
        logger.warning(f"Invalid CRAWLER_DUMMY_METRICS_EVERY '{raw_value}', defaulting to 10")
        return 10


def _resolve_run_identity() -> tuple[str, str]:
    """Resolve crawler run namespace and name from environment variables."""

    run_namespace = os.getenv(
        "CRAWLER_RUN_NAMESPACE",
        os.getenv("CRAWLER_DUMMY_RUN_NAMESPACE", "default"),
    )
    run_name = os.getenv(
        "CRAWLER_RUN_NAME",
        os.getenv("CRAWLER_DUMMY_RUN_NAME", "crawler-dummy"),
    )
    return run_namespace, run_name


async def _send_event(client: HttpClient, endpoint: str, message: str) -> None:
    """Send crawler event to management backend."""

    payload = {
        "type": "INFO",
        "message": message,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    response = await client.call_management_endpoint_from_env(
        endpoint=endpoint,
        method="POST",
        json_body=payload,
    )
    logger.info(f"Event reported successfully ({endpoint}): {response.status_code}")


async def _send_metrics(
    client: HttpClient,
    endpoint: str,
    run_started_at: str,
    progress: int,
    crawled_data_sets: int,
) -> None:
    """Send crawler progress metrics to management backend."""

    payload = {
        "progress": progress,
        "crawledDataSets": crawled_data_sets,
        "runStartedAt": run_started_at,
    }
    response = await client.call_management_endpoint_from_env(
        endpoint=endpoint,
        method="POST",
        json_body=payload,
    )
    logger.info(f"Metrics reported successfully ({endpoint}): {response.status_code}")


def _load_local_env() -> None:
    """Load local .env file for development if present.

    In Kubernetes, environment variables are injected directly from Secrets and
    therefore this optional file is typically not used.
    """

    env_path = Path(__file__).parent.parent / ".env"
    load_dotenv(dotenv_path=env_path)


async def _notify_management_backend() -> None:
    """Run dummy workflow and report startup, progress metrics, and success."""

    run_namespace, run_name = _resolve_run_identity()
    base_url = os.getenv("MANAGEMENT_BACKEND_URL", "<missing MANAGEMENT_BACKEND_URL>")
    events_endpoint = os.getenv(
        "CRAWLER_DUMMY_ENDPOINT",
        f"/api/v1/crawler-runs/{run_namespace}/{run_name}/events",
    )
    metrics_endpoint = os.getenv(
        "CRAWLER_DUMMY_METRICS_ENDPOINT",
        f"/api/v1/crawler-runs/{run_namespace}/{run_name}/metrics",
    )
    metrics_every = _resolve_metrics_interval()

    events_url = (
        f"{base_url.rstrip('/')}{events_endpoint if events_endpoint.startswith('/') else f'/{events_endpoint}'}"
    )
    metrics_url = (
        f"{base_url.rstrip('/')}{metrics_endpoint if metrics_endpoint.startswith('/') else f'/{metrics_endpoint}'}"
    )
    logger.info(f"Using management backend events endpoint: POST {events_url}")
    logger.info(f"Using management backend metrics endpoint: POST {metrics_url}")

    client = HttpClient(timeout=10)
    run_started_at = datetime.now(timezone.utc).isoformat()

    await _send_event(client, events_endpoint, "crawler_dummy startup ping")

    with open("progress.txt", "w") as progress_file:
        for i in range(1, 101):
            progress_file.write(f"{i}\n")
            progress_file.flush()
            print(f"Progress: {i}/100")

            if i % metrics_every == 0 or i == 100:
                await _send_metrics(
                    client=client,
                    endpoint=metrics_endpoint,
                    run_started_at=run_started_at,
                    progress=i,
                    crawled_data_sets=i,
                )

            await asyncio.sleep(1)

    await _send_event(client, events_endpoint, "crawler_dummy finished successfully")


def main():
    _load_local_env()

    try:
        asyncio.run(_notify_management_backend())
    except ValueError as error:
        logger.warning(f"Skipping management backend call due to missing env config: {error}")
    except httpx.HTTPError as error:
        logger.error(f"Management backend call failed: {error}")


if __name__ == "__main__":
    main()
