"""Hello unit test module."""

from crawler_general.hello import hello


def test_hello():
    """Test the hello function."""
    assert hello() == "Hello crawler-general"
