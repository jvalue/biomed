"""FTP configuration loader shared across crawler apps."""

from __future__ import annotations

import logging
import os
from collections.abc import Iterable
from pathlib import Path

from dotenv import load_dotenv

logger = logging.getLogger(__name__)


def _load_env(dotenv_path: Path | str | None) -> None:
    """Load environment variables from the provided .env path if given.

    When ``dotenv_path`` is None, python-dotenv will search using its defaults
    (current working directory and parents). This keeps the function flexible
    for different callers.
    """

    if dotenv_path is None:
        load_dotenv()
    else:
        load_dotenv(dotenv_path=dotenv_path)


def load_env_vars(dotenv_path: Path | str | None = None) -> tuple[str, str, str, int]:
    """Load FTP credentials from environment variables.

    Args:
        dotenv_path: Optional path to a .env file. If omitted, the current
            process environment (plus any default .env discovered by
            python-dotenv) is used.

    Returns:
        Tuple of (ftp_url, ftp_user, ftp_password, ftp_max_depth).

    Raises:
        ValueError: If any required variable is missing.
    """

    _load_env(dotenv_path)

    ftp_url: str | None = os.getenv("FTP_URL")
    ftp_user: str | None = os.getenv("FTP_USER")
    ftp_password: str | None = os.getenv("FTP_PASSWORD")
    ftp_max_depth: str | None = os.getenv("FTP_MAX_DEPTH")

    try:
        ftp_max_depth = int(ftp_max_depth) if ftp_max_depth else 3
    except ValueError:
        logger.warning(f"Invalid max depth '{ftp_max_depth}', defaulting to 3")
        ftp_max_depth = 3

    missing: list[str] = _missing_vars(
        [("FTP_URL", ftp_url), ("FTP_USER", ftp_user), ("FTP_PASSWORD", ftp_password)]
    )
    if missing:
        location_hint = f" using .env at {dotenv_path}" if dotenv_path else ""
        raise ValueError(
            f"Missing environment variables{location_hint}: {', '.join(missing)}"
        )

    if ftp_url is None or ftp_user is None or ftp_password is None:
        raise ValueError("FTP credentials must not be None after validation")

    return ftp_url, ftp_user, ftp_password, ftp_max_depth


def _missing_vars(pairs: Iterable[tuple[str, str | None]]) -> list[str]:
    """Return the names of any env vars whose value is falsy/None."""

    return [name for name, value in pairs if not value]
