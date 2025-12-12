"""
Configuration management for the FastAPI application.
Uses pydantic-settings for type-safe environment variable management.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.
    """
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )
    
    # Database
    database_url: str
    
    # Supabase (optional, for direct API access if needed)
    api_key: str | None = None
    
    # CORS
    cors_origins: List[str] = ["http://localhost:5173", "http://localhost:3000"]
    
    # API Configuration
    api_v1_prefix: str = "/api/v1"
    app_name: str = "Geologic Data API"
    app_version: str = "1.0.0"
    
    # Pagination defaults
    default_page_size: int = 100
    max_page_size: int = 1000
    
    # Supabase Storage
    supabase_storage_url: str = "https://iwyygcmgtjrclhyykapf.supabase.co/storage/v1/object/public/photos"


# Create a global settings instance
settings = Settings()

