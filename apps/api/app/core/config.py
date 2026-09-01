import os
import sys
from typing import List, Optional, Union
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, field_validator

class Settings(BaseSettings):
    PROJECT_NAME: str = "ORBÍTICA POS API"
    VERSION: str = "2.4.0"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = Field(default="development", alias="ENVIRONMENT")
    
    # Cryptographic JWT Secret (Minimum 32 characters)
    JWT_SECRET_KEY: str = Field(
        default="dev_secret_key_change_in_production_orbitica_pos_2026_super_secure",
        alias="JWT_SECRET_KEY"
    )
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Master Key for encrypting .p12 certificates and passwords (AES-256 / Fernet key)
    ENCRYPTION_MASTER_KEY: str = Field(
        default="DEV_MASTER_KEY_32_BYTES_FOR_DEV_ONLY_123456=",
        alias="ENCRYPTION_MASTER_KEY"
    )
    
    # Security Lockout & Rate Limiting
    MAX_LOGIN_ATTEMPTS: int = 5
    LOCKOUT_MINUTES: int = 15
    STEP_UP_TOKEN_EXPIRE_MINUTES: int = 5
    
    # CORS Configuration
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "https://web-mocha-gamma-es6gomw437.vercel.app",
        "https://orbitica-pos.vercel.app"
    ]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return v
        return []
    
    # PostgreSQL Database URL
    DATABASE_URL: str = Field(
        default="sqlite+aiosqlite:///./orbitica_pos.db",
        alias="DATABASE_URL"
    )
    SYNC_DATABASE_URL: str = Field(
        default="sqlite:///./orbitica_pos.db",
        alias="SYNC_DATABASE_URL"
    )
    
    # Regional Costa Rica Defaults
    DEFAULT_CURRENCY: str = "CRC"
    DEFAULT_TIMEZONE: str = "America/Costa_Rica"
    
    # Software Provider Info (v4.4 ProveedorSistemas)
    HACIENDA_PROVEEDOR_ID: str = Field(default="3101000000", alias="HACIENDA_PROVEEDOR_ID")
    HACIENDA_PROVEEDOR_NAME: str = Field(default="ORBITICA STUDIO S.A.", alias="HACIENDA_PROVEEDOR_NAME")
    
    # Cookie Configuration
    COOKIE_DOMAIN: Optional[str] = None
    COOKIE_SECURE: bool = False
    COOKIE_SAMESITE: str = "lax"
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    def validate_production_readiness(self) -> None:
        """
        Validates critical security and infrastructure requirements before starting in production.
        FastAPI refuses to boot if insecure defaults are present in production.
        """
        if self.ENVIRONMENT.lower() == "production":
            errors = []
            
            # 1. Reject default or weak JWT Secret
            if "dev_secret_key" in self.JWT_SECRET_KEY or len(self.JWT_SECRET_KEY) < 32:
                errors.append("JWT_SECRET_KEY must be a secure key with at least 32 characters in production.")
                
            # 2. Reject SQLite in production
            if "sqlite" in self.DATABASE_URL.lower():
                errors.append("DATABASE_URL must be a PostgreSQL connection in production (sqlite is not allowed).")
                
            # 3. Master Encryption Key check
            if "DEV_MASTER_KEY" in self.ENCRYPTION_MASTER_KEY or len(self.ENCRYPTION_MASTER_KEY) < 16:
                errors.append("ENCRYPTION_MASTER_KEY must be set with a production encryption key.")
                
            # 4. CORS validation
            if not self.BACKEND_CORS_ORIGINS or "*" in self.BACKEND_CORS_ORIGINS:
                errors.append("BACKEND_CORS_ORIGINS cannot be empty or '*' in production.")
                
            if errors:
                error_msg = "\n[CRITICAL STARTUP ERROR] Production configuration validation failed:\n" + "\n".join(f"  - {e}" for e in errors)
                raise RuntimeError(error_msg)

settings = Settings()
