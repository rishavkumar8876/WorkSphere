from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "WorkSphere Analytics Engine"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Service Authentication Key (shared with Express Core API)
    INTERNAL_API_KEY: str = "worksphere_internal_analytics_api_secret_key"
    
    # Environment
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    
    # Database URL (optional direct read-only query access or via REST payload)
    DATABASE_URL: Optional[str] = None

    model_config = SettingsConfigDict(
        extra="ignore",
        env_file=".env",
        case_sensitive=True
    )

settings = Settings()
