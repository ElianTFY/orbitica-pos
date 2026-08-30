from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    PROJECT_NAME: str = "ORBÍTICA POS API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = Field(default="development", alias="ENVIRONMENT")
    
    JWT_SECRET_KEY: str = Field(default="dev_secret_key_change_in_production_orbitica_pos_2026_super_secure", alias="JWT_SECRET_KEY")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    MAX_LOGIN_ATTEMPTS: int = 5
    LOCKOUT_MINUTES: int = 15
    
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "https://orbitica-pos.vercel.app"
    ]
    
    DATABASE_URL: str = Field(
        default="sqlite+aiosqlite:///C:/Users/elian/.gemini/antigravity/scratch/orbitica-pos/apps/api/orbitica_pos.db",
        alias="DATABASE_URL"
    )
    SYNC_DATABASE_URL: str = Field(
        default="sqlite:///C:/Users/elian/.gemini/antigravity/scratch/orbitica-pos/apps/api/orbitica_pos.db",
        alias="SYNC_DATABASE_URL"
    )
    
    DEFAULT_CURRENCY: str = "CRC"
    DEFAULT_TIMEZONE: str = "America/Costa_Rica"
    
    COOKIE_DOMAIN: Optional[str] = None
    COOKIE_SECURE: bool = False
    COOKIE_SAMESITE: str = "lax"
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
