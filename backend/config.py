"""Application configuration settings"""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings"""

    # App settings
    app_name: str = "Whazz Audio Authentication API"
    debug: bool = True

    # Database settings - PostgreSQL
    database_url: str = "postgresql://postgres:postgres@localhost:5432/whazz_audio"

    # Alternative: Individual PostgreSQL settings (optional, for manual connection string building)
    postgres_user: str = "postgres"
    postgres_password: str = "postgres"
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_db: str = "whazz_audio"

    # Security settings
    secret_key: str = "94fb8603af544370a40ab4eac0de704715d6c688d51e7a60960f1c276975bb81"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    # CORS settings
    cors_origins: list = [
        "http://localhost:3000",
        "http://localhost:8000",
        "http://localhost:5173",
    ]

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings():
    """Get cached settings instance"""
    return Settings()
