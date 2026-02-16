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

    if ftp_url is None or ftp_user is None or ftp_password is None:
        raise ValueError("FTP credentials must not be None after validation")

    return ftp_url, ftp_user, ftp_password


def _missing_vars(pairs: Iterable[tuple[str, str | None]]) -> list[str]:
    """Return the names of any env vars whose value is falsy/None."""

    return [name for name, value in pairs if not value]


def load_database_config(dotenv_path: Path | str | None = None) -> dict[str, str | int]:
    """Load PostgreSQL database configuration from environment variables.

    Args:
        dotenv_path: Optional path to a .env file. If omitted, the current
            process environment (plus any default .env discovered by
            python-dotenv) is used.

    Returns:
        Dictionary with keys: host, port, database, user, password.

    Raises:
        ValueError: If any required variable is missing.
    """

    _load_env(dotenv_path)

    db_host: str | None = os.getenv("DB_HOST")
    db_port_str: str | None = os.getenv("DB_PORT")
    db_name: str | None = os.getenv("DB_NAME")
    db_user: str | None = os.getenv("DB_USER")
    db_password: str | None = os.getenv("DB_PASSWORD")

    missing: list[str] = _missing_vars(
        [
            ("DB_HOST", db_host),
            ("DB_PORT", db_port_str),
            ("DB_NAME", db_name),
            ("DB_USER", db_user),
            ("DB_PASSWORD", db_password),
        ]
    )
    if missing:
        location_hint = f" using .env at {dotenv_path}" if dotenv_path else ""
        raise ValueError(
            f"Missing database configuration variables{location_hint}: {', '.join(missing)}"
        )

    if db_port_str is None:
        raise ValueError("DB_PORT is required but was not provided")

    try:
        db_port = int(db_port_str)
    except ValueError:
        raise ValueError(f"DB_PORT must be an integer, got '{db_port_str}'")

    if db_host is None or db_name is None or db_user is None or db_password is None:
        raise ValueError("Database configuration values must not be None")

    return {
        "host": db_host,
        "port": db_port,
        "database": db_name,
        "user": db_user,
        "password": db_password,
    }
