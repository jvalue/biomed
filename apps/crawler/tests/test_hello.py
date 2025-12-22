"""Hello unit test module."""

from crawler_general.main import main


def test_hello():
    """Test the hello function."""
    assert main() == "Hello crawler-general"
