from typing import Optional, List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    PROJECT_NAME: str = "THREADLINE"
    PROJECT_CODENAME: str = "THREADLINE"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Environment
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    
    # Database
    DATABASE_URL: str = Field(
        default="sqlite+aiosqlite:///./threadline.db",
        description="SQLAlchemy Database URL (e.g. postgresql+asyncpg://user:pass@localhost:5432/threadline or sqlite+aiosqlite:///./threadline.db)"
    )
    
    # Redis / Queue
    REDIS_URL: Optional[str] = "redis://localhost:6379/0"
    
    # Security
    JWT_SECRET: str = "threadline_super_secret_jwt_key_change_in_production_987654321"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Symmetric Encryption for Stored Provider Credentials (Fernet)
    ENCRYPTION_KEY: str = "rVvQ1-7l2aP4_k_d0Q8i6M2R9w1T5v_7y9A1c4E3G2I="
    
    # External Integration API Keys / Credentials (Optional environment defaults)
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: str = "gpt-4o"
    
    APOLLO_API_KEY: Optional[str] = None
    HUNTER_API_KEY: Optional[str] = None
    
    TELEGRAM_BOT_TOKEN: Optional[str] = None
    TELEGRAM_BOT_USERNAME: Optional[str] = None
    TELEGRAM_WEBHOOK_SECRET: Optional[str] = "telegram_secret_webhook_token"
    
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    GOOGLE_REDIRECT_URI: Optional[str] = "http://localhost:5173/integrations/google/callback"
    
    LINKEDIN_CLIENT_ID: Optional[str] = None
    LINKEDIN_CLIENT_SECRET: Optional[str] = None
    LINKEDIN_REDIRECT_URI: Optional[str] = "http://localhost:5173/integrations/linkedin/callback"
    
    HUBSPOT_API_KEY: Optional[str] = None
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "*"
    ]

settings = Settings()
