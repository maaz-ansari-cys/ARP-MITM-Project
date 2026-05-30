"""
Configuration module for the Python network service.
Loads environment variables and provides configuration settings.

Network settings default to "auto" which triggers runtime auto-detection.
"""

from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # MongoDB Configuration
    mongodb_url: str = "mongodb://localhost:27017"
    mongodb_db_name: str = "network_visibility"
    
    # Network Configuration
    # Set to "auto" (default) to auto-detect at runtime.
    # Override in .env only if you need to force a specific interface/range.
    network_interface: str = "auto"
    network_range: str = "auto"
    
    # Server Configuration
    host: str = "0.0.0.0"
    port: int = 8000
    
    # CORS Configuration
    cors_origins: str = "http://localhost:3000"
    
    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS origins string into list."""
        return [origin.strip() for origin in self.cors_origins.split(",")]
    
    class Config:
        env_file = ".env"
        case_sensitive = False


# Global settings instance
settings = Settings()
