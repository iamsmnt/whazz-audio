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

    # File upload settings
    upload_dir: str = "./uploads"  # Local storage directory for uploaded files
    max_file_size_mb: int = 100  # Maximum file size in MB
    allowed_audio_formats: list = [".wav", ".mp3", ".flac", ".m4a", ".ogg"]
    file_expiry_hours: int = 24  # Files auto-delete after 24 hours

    # RabbitMQ/Celery settings
    rabbitmq_url: str = "amqp://guest:guest@localhost:5672//"
    celery_broker_url: str = "amqp://guest:guest@localhost:5672//"
    # Use PostgreSQL for result backend (no Redis needed!)
    celery_result_backend: str = "db+postgresql://postgres:postgres@localhost:5432/whazz_audio"

    # Audio processing settings
    output_dir: str = "./processed_audio"  # Directory for processed audio files
    clearvoice_model_name: str = "MossFormer2_SE_48K"

    # Email settings (SMTP)
    smtp_server: str = "smtp.gmail.com"  # Gmail SMTP server (change for other providers)
    smtp_port: int = 587
    smtp_use_tls: bool = True
    smtp_username: str = ""  # Your email address
    smtp_password: str = ""  # App password or email password
    smtp_from_email: str = ""  # Sender email address
    frontend_url: str = "http://localhost:5173"  # Frontend URL for verification links
    require_email_verification: bool = True  # Set to False to disable email verification

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings():
    """Get cached settings instance"""
    return Settings()
