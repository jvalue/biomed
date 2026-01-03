"""FTP configuration loader shared across crawler apps."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Iterable

from dotenv import load_dotenv


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


def load_env_vars(dotenv_path: Path | str | None = None) -> tuple[str, str, str]:
    """Load FTP credentials from environment variables.

    Args:
        dotenv_path: Optional path to a .env file. If omitted, the current
            process environment (plus any default .env discovered by
            python-dotenv) is used.

    Returns:
        Tuple of (ftp_url, ftp_user, ftp_password).

    Raises:
        ValueError: If any required variable is missing.
    """

    _load_env(dotenv_path)

    ftp_url: str | None = os.getenv("FTP_URL")
    ftp_user: str | None = os.getenv("FTP_USER")
    ftp_password: str | None = os.getenv("FTP_PASSWORD")

    missing: list[str] = _missing_vars(
        [("FTP_URL", ftp_url), ("FTP_USER", ftp_user), ("FTP_PASSWORD", ftp_password)]
    )
    if missing:
        location_hint = f" using .env at {dotenv_path}" if dotenv_path else ""
        raise ValueError(
            f"Missing environment variables{location_hint}: {', '.join(missing)}"
        )

    assert ftp_url is not None and ftp_user is not None and ftp_password is not None

    return ftp_url, ftp_user, ftp_password


def _missing_vars(pairs: Iterable[tuple[str, str | None]]) -> list[str]:
    """Return the names of any env vars whose value is falsy/None."""

    return [name for name, value in pairs if not value]
