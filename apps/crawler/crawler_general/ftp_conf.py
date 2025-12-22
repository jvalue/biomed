import os
from pathlib import Path
from dotenv import load_dotenv

def load_env_vars() -> tuple[str, str, str]:
    """Load environment variables from .env file.
    
    Returns:
        Tuple of (ftp_url, ftp_user, ftp_password)
    """
    env_path = Path(__file__).parent / ".env"
    load_dotenv(dotenv_path=env_path)
    
    ftp_url: str = os.getenv("FTP_URL")
    ftp_user: str = os.getenv("FTP_USER")
    ftp_password: str = os.getenv("FTP_PASSWORD")
    
    if not all([ftp_url, ftp_user, ftp_password]):
        missing = [var for var, val in [("FTP_URL", ftp_url), ("FTP_USER", ftp_user), ("FTP_PASSWORD", ftp_password)] if not val]
        raise ValueError(f"Missing environment variables: {', '.join(missing)}")
    
    return ftp_url, ftp_user, ftp_password
