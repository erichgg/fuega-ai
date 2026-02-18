from pydantic_settings import BaseSettings
import re
import yaml
from pathlib import Path
from functools import lru_cache


class Settings(BaseSettings):
    anthropic_api_key: str = ""
    database_url: str = "sqlite+aiosqlite:///./data/fuega.db"
    redis_url: str = "redis://localhost:6379/0"
    twitter_api_key: str = ""
    twitter_api_secret: str = ""
    twitter_access_token: str = ""
    twitter_access_secret: str = ""
    buffer_access_token: str = ""
    resend_api_key: str = ""
    resend_from_domain: str = "fuega.ai"
    elevenlabs_api_key: str = ""
    pexels_api_key: str = ""
    youtube_api_key: str = ""
    youtube_client_id: str = ""
    youtube_client_secret: str = ""
    openai_api_key: str = ""
    wordpress_url: str = ""
    wordpress_username: str = ""
    wordpress_app_password: str = ""
    dashboard_host: str = "127.0.0.1"
    dashboard_port: int = 8000
    api_host: str = "127.0.0.1"
    api_port: int = 8000
    cors_origins: list[str] = ["http://localhost:5173", "https://fuega.ai", "https://app.fuega.ai"]
    environment: str = "development"
    log_level: str = "INFO"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}


@lru_cache
def get_settings() -> Settings:
    return Settings()


def _config_dir() -> Path:
    return Path(__file__).parent.parent.parent / "config"


def load_yaml_config(name: str) -> dict:
    if not re.match(r'^[a-z0-9_]+$', name):
        raise ValueError(f"Invalid config name: {name}")
    path = _config_dir() / f"{name}.yaml"
    if path.exists():
        with open(path) as f:
            return yaml.safe_load(f) or {}
    return {}


def save_yaml_config(name: str, data: dict) -> None:
    """Write config data back to a YAML file."""
    if not re.match(r'^[a-z0-9_]+$', name):
        raise ValueError(f"Invalid config name: {name}")
    path = _config_dir() / f"{name}.yaml"
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w") as f:
        yaml.dump(data, f, default_flow_style=False, allow_unicode=True, sort_keys=False)
