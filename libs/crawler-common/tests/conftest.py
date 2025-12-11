"""Pytest configuration for crawler-common tests."""

import pytest


@pytest.fixture
def sample_url():
    """Sample URL for testing."""
    return "https://example.com"
