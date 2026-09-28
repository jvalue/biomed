import asyncio
import logging
import os
import random
from datetime import UTC, datetime
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
        logger.warning(
            f"Invalid CRAWLER_DUMMY_METRICS_EVERY '{raw_value}', defaulting to 10"
        )
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


def _resolve_schedule_identity() -> tuple[str | None, str | None]:
    """Resolve optional schedule identity used for crawler run metrics."""

    schedule_namespace = os.getenv(
        "CRAWLER_SCHEDULE_NAMESPACE",
        os.getenv("CRAWLER_DUMMY_SCHEDULE_NAMESPACE"),
    )
    schedule_name = os.getenv(
        "CRAWLER_SCHEDULE_NAME",
        os.getenv("CRAWLER_DUMMY_SCHEDULE_NAME"),
    )
    return schedule_namespace, schedule_name


async def _send_event(client: HttpClient, endpoint: str, message: str) -> None:
    """Send crawler event to management backend."""

    payload = {
        "type": "INFO",
        "message": message,
        "timestamp": datetime.now(UTC).isoformat(),
    }
    print(f"[crawler] POST event -> {endpoint} payload={payload}")
    response = await client.call_management_endpoint_from_env(
        endpoint=endpoint,
        method="POST",
        json_body=payload,
    )
    print(f"[crawler] Event reported: {response.status_code} ({endpoint})")
    logger.info(f"Event reported successfully ({endpoint}): {response.status_code}")


async def _send_metrics(
    client: HttpClient,
    endpoint: str,
    run_started_at: str,
    schedule_name: str | None,
    schedule_namespace: str | None,
    progress: int,
    crawled_data_sets: int,
    cache_hits: int,
) -> None:
    """Send crawler progress metrics to management backend."""

    payload = {
        "progress": progress,
        "crawledDataSets": crawled_data_sets,
        "cacheHits": cache_hits,
        "runStartedAt": run_started_at,
    }
    if schedule_name and schedule_namespace:
        payload["scheduleName"] = schedule_name
        payload["scheduleNamespace"] = schedule_namespace
    elif schedule_name or schedule_namespace:
        logger.warning(
            "Skipping schedule fields for metrics because only one of "
            "schedule name/namespace is set"
        )
    response = await client.call_management_endpoint_from_env(
        endpoint=endpoint,
        method="POST",
        json_body=payload,
    )
    print(
        f"[crawler] Metrics reported: {response.status_code} ({endpoint}) progress={progress}"
    )
    logger.info(f"Metrics reported successfully ({endpoint}): {response.status_code}")


async def _send_download_metrics(
    client: HttpClient,
    endpoint: str,
    run_started_at: str,
    schedule_name: str | None,
    schedule_namespace: str | None,
    total_datasets_to_download: int,
    downloaded_datasets: int,
    total_gb_to_download: int,
    downloaded_gb: int,
) -> None:
    """Send crawler download metrics to management backend."""

    payload = {
        "totalDatasetsToDownload": total_datasets_to_download,
        "downloadedDatasets": downloaded_datasets,
        "totalGBToDownload": total_gb_to_download,
        "downloadedGB": downloaded_gb,
        "runStartedAt": run_started_at,
    }
    if schedule_name and schedule_namespace:
        payload["scheduleName"] = schedule_name
        payload["scheduleNamespace"] = schedule_namespace
    elif schedule_name or schedule_namespace:
        logger.warning(
            "Skipping schedule fields for download metrics because only one of "
            "schedule name/namespace is set"
        )
    response = await client.call_management_endpoint_from_env(
        endpoint=endpoint,
        method="POST",
        json_body=payload,
    )
    print(
        f"[crawler] Download metrics reported: {response.status_code} ({endpoint}) downloaded={downloaded_datasets}/{total_datasets_to_download}"
    )
    logger.info(
        f"Download metrics reported successfully ({endpoint}): {response.status_code}"
    )


def _load_local_env() -> None:
    """Load local .env file for development if present.

    In Kubernetes, environment variables are injected directly from Secrets and
    therefore this optional file is typically not used.
    """

    env_path = Path(__file__).parent.parent / ".env"
    load_dotenv(dotenv_path=env_path)


def _build_organic_snapshot(
    progress: int,
    previous_crawled_data_sets: int,
    previous_total_datasets_to_download: int,
    previous_downloaded_datasets: int,
) -> tuple[int, int, int, int, int, int]:
    """Build monotonic, slightly varied metrics with cache hit rate near 80 percent."""

    crawled_target = max(0, progress + random.randint(-2, 2))
    crawled_data_sets = max(previous_crawled_data_sets, crawled_target)
    cache_ratio = min(0.84, max(0.76, random.uniform(0.78, 0.82)))
    cache_hits = min(crawled_data_sets, int(round(crawled_data_sets * cache_ratio)))

    discovered_data_sets = max(0, crawled_data_sets - cache_hits)
    total_datasets_to_download = max(
        previous_total_datasets_to_download, discovered_data_sets
    )

    lag = random.randint(1, 4)
    downloaded_target = max(0, total_datasets_to_download - lag + random.randint(-1, 1))
    downloaded_datasets = min(
        total_datasets_to_download,
        max(previous_downloaded_datasets, downloaded_target),
    )

    # Ensure downloads complete when progress reaches the end so the
    # simulated downloader doesn't remain behind discovery indefinitely.
    if progress >= 100:
        downloaded_datasets = total_datasets_to_download

    total_gb_to_download = total_datasets_to_download * 10
    downloaded_gb = downloaded_datasets * 10

    return (
        crawled_data_sets,
        cache_hits,
        total_datasets_to_download,
        downloaded_datasets,
        total_gb_to_download,
        downloaded_gb,
    )


async def _notify_management_backend() -> None:
    """Run dummy workflow and report startup, progress metrics, and success."""

    run_namespace, run_name = _resolve_run_identity()
    schedule_namespace, schedule_name = _resolve_schedule_identity()
    base_url = os.getenv("MANAGEMENT_BACKEND_URL", "<missing MANAGEMENT_BACKEND_URL>")
    events_endpoint = os.getenv(
        "CRAWLER_DUMMY_ENDPOINT",
        f"/api/v1/crawler-runs/{run_namespace}/{run_name}/events",
    )
    metrics_endpoint = os.getenv(
        "CRAWLER_DUMMY_METRICS_ENDPOINT",
        f"/api/v1/crawler-runs/{run_namespace}/{run_name}/metrics",
    )
    download_metrics_endpoint = os.getenv(
        "CRAWLER_DUMMY_DOWNLOAD_METRICS_ENDPOINT",
        f"/api/v1/crawler-runs/{run_namespace}/{run_name}/download-metrics",
    )
    metrics_every = _resolve_metrics_interval()

    events_url = f"{base_url.rstrip('/')}{events_endpoint if events_endpoint.startswith('/') else f'/{events_endpoint}'}"
    metrics_url = f"{base_url.rstrip('/')}{metrics_endpoint if metrics_endpoint.startswith('/') else f'/{metrics_endpoint}'}"
    download_metrics_url = f"{base_url.rstrip('/')}{download_metrics_endpoint if download_metrics_endpoint.startswith('/') else f'/{download_metrics_endpoint}'}"
    logger.info(f"Using management backend events endpoint: POST {events_url}")
    logger.info(f"Using management backend metrics endpoint: POST {metrics_url}")
    logger.info(
        f"Using management backend download metrics endpoint: POST {download_metrics_url}"
    )

    client = HttpClient(timeout=10)
    run_started_at = datetime.now(UTC).isoformat()

    await _send_event(client, events_endpoint, "crawler_dummy startup ping")

    previous_crawled_data_sets = 0
    previous_total_datasets_to_download = 0
    previous_downloaded_datasets = 0

    with open("progress.txt", "w") as progress_file:
        for i in range(1, 101):
            progress_file.write(f"{i}\n")
            progress_file.flush()
            print(f"Progress: {i}/100")

            if i % metrics_every == 0 or i == 100:
                (
                    crawled_data_sets,
                    cache_hits,
                    total_datasets_to_download,
                    downloaded_datasets,
                    total_gb_to_download,
                    downloaded_gb,
                ) = _build_organic_snapshot(
                    progress=i,
                    previous_crawled_data_sets=previous_crawled_data_sets,
                    previous_total_datasets_to_download=previous_total_datasets_to_download,
                    previous_downloaded_datasets=previous_downloaded_datasets,
                )
                previous_crawled_data_sets = crawled_data_sets
                previous_total_datasets_to_download = total_datasets_to_download
                previous_downloaded_datasets = downloaded_datasets
                await _send_metrics(
                    client=client,
                    endpoint=metrics_endpoint,
                    run_started_at=run_started_at,
                    schedule_name=schedule_name,
                    schedule_namespace=schedule_namespace,
                    progress=i,
                    crawled_data_sets=crawled_data_sets,
                    cache_hits=cache_hits,
                )
                await _send_download_metrics(
                    client=client,
                    endpoint=download_metrics_endpoint,
                    run_started_at=run_started_at,
                    schedule_name=schedule_name,
                    schedule_namespace=schedule_namespace,
                    total_datasets_to_download=total_datasets_to_download,
                    downloaded_datasets=downloaded_datasets,
                    total_gb_to_download=total_gb_to_download,
                    downloaded_gb=downloaded_gb,
                )

            await asyncio.sleep(1)

    await _send_event(client, events_endpoint, "crawler_dummy finished successfully")


def main():
    _load_local_env()

    try:
        asyncio.run(_notify_management_backend())
    except ValueError as error:
        logger.warning(
            f"Skipping management backend call due to missing env config: {error}"
        )
    except httpx.HTTPError as error:
        logger.error(f"Management backend call failed: {error}")


if __name__ == "__main__":
    main()
