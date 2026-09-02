import os
import sys
from typing import List, Optional, Union
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, field_validator, model_validator

class Settings(BaseSettings):
    PROJECT_NAME: str = "ORBÍTICA POS API"
    VERSION: str = "2.4.0"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = Field(default="development", alias="ENVIRONMENT")
    
    # Cryptographic JWT Secret (Accepts JWT_SECRET_KEY or SECRET_KEY)
    JWT_SECRET_KEY: str = Field(
        default="dev_secret_key_change_in_production_orbitica_pos_2026_super_secure",
        alias="JWT_SECRET_KEY"
    )
    SECRET_KEY: Optional[str] = Field(default=None, alias="SECRET_KEY")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Master Key for encrypting .p12 certificates (Accepts ENCRYPTION_MASTER_KEY or FERNET_KEY)
    ENCRYPTION_MASTER_KEY: str = Field(
        default="DEV_MASTER_KEY_32_BYTES_FOR_DEV_ONLY_123456=",
        alias="ENCRYPTION_MASTER_KEY"
    )
    FERNET_KEY: Optional[str] = Field(default=None, alias="FERNET_KEY")
    
    # Security Lockout & Rate Limiting
    MAX_LOGIN_ATTEMPTS: int = 5
    LOCKOUT_MINUTES: int = 15
    STEP_UP_TOKEN_EXPIRE_MINUTES: int = 5
    
    # CORS Configuration (Accepts BACKEND_CORS_ORIGINS or CORS_ORIGINS)
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "https://web-mocha-gamma-es6gomw437.vercel.app",
        "https://orbitica-pos.vercel.app"
    ]
    CORS_ORIGINS: Optional[Union[str, List[str]]] = Field(default=None, alias="CORS_ORIGINS")

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
    REDIS_URL: Optional[str] = Field(default=None, alias="REDIS_URL")
    
    # Regional Costa Rica Defaults
    DEFAULT_CURRENCY: str = "CRC"
    DEFAULT_TIMEZONE: str = "America/Costa_Rica"
    
    # Software Provider Info (v4.4 ProveedorSistemas)
    SOFTWARE_PROVIDER_TAX_ID_TYPE: str = "02"  # 02=Cedula Juridica
    SOFTWARE_PROVIDER_TAX_ID: str = Field(default="3101000000", alias="SOFTWARE_PROVIDER_TAX_ID")
    SOFTWARE_PROVIDER_NAME: str = Field(default="ORBITICA STUDIO S.A.", alias="SOFTWARE_PROVIDER_NAME")
    HACIENDA_PROVEEDOR_ID: Optional[str] = Field(default=None, alias="HACIENDA_PROVEEDOR_ID")
    HACIENDA_PROVEEDOR_NAME: Optional[str] = Field(default=None, alias="HACIENDA_PROVEEDOR_NAME")

    # Safety Guardrails: Fiscal Emission Block
    # Block live production fiscal emission until ATV Sandbox validation is complete and confirmed.
    HACIENDA_LIVE_EMISSION_ENABLED: bool = Field(default=False, alias="HACIENDA_LIVE_EMISSION_ENABLED")
    HACIENDA_SANDBOX_VALIDATED: bool = Field(default=False, alias="HACIENDA_SANDBOX_VALIDATED")
    
    # Cookie Configuration
    COOKIE_DOMAIN: Optional[str] = None
    COOKIE_SECURE: bool = False
    COOKIE_SAMESITE: str = "lax"

    @model_validator(mode="after")
    def sync_aliases(self) -> "Settings":
        # Unify SECRET_KEY <-> JWT_SECRET_KEY
        if self.SECRET_KEY and self.JWT_SECRET_KEY == "dev_secret_key_change_in_production_orbitica_pos_2026_super_secure":
            self.JWT_SECRET_KEY = self.SECRET_KEY
        # Unify FERNET_KEY <-> ENCRYPTION_MASTER_KEY
        if self.FERNET_KEY and self.ENCRYPTION_MASTER_KEY == "DEV_MASTER_KEY_32_BYTES_FOR_DEV_ONLY_123456=":
            self.ENCRYPTION_MASTER_KEY = self.FERNET_KEY
        # Unify CORS_ORIGINS <-> BACKEND_CORS_ORIGINS
        if self.CORS_ORIGINS:
            if isinstance(self.CORS_ORIGINS, list):
                self.BACKEND_CORS_ORIGINS = self.CORS_ORIGINS
            elif isinstance(self.CORS_ORIGINS, str) and not self.CORS_ORIGINS.startswith("["):
                self.BACKEND_CORS_ORIGINS = [i.strip() for i in self.CORS_ORIGINS.split(",") if i.strip()]
        # Unify HACIENDA_PROVEEDOR_* <-> SOFTWARE_PROVIDER_*
        if self.HACIENDA_PROVEEDOR_ID:
            self.SOFTWARE_PROVIDER_TAX_ID = self.HACIENDA_PROVEEDOR_ID
        if self.HACIENDA_PROVEEDOR_NAME:
            self.SOFTWARE_PROVIDER_NAME = self.HACIENDA_PROVEEDOR_NAME
        return self

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
                errors.append("JWT_SECRET_KEY / SECRET_KEY must be a secure key with at least 32 characters in production.")
                
            # 2. Reject SQLite in production
            if "sqlite" in self.DATABASE_URL.lower():
                errors.append("DATABASE_URL must be a PostgreSQL connection in production (sqlite is not allowed).")
                
            # 3. Master Encryption Key check
            if "DEV_MASTER_KEY" in self.ENCRYPTION_MASTER_KEY or len(self.ENCRYPTION_MASTER_KEY) < 16:
                errors.append("ENCRYPTION_MASTER_KEY / FERNET_KEY must be set with a production encryption key.")
                
            # 4. CORS validation
            if not self.BACKEND_CORS_ORIGINS or "*" in self.BACKEND_CORS_ORIGINS:
                errors.append("BACKEND_CORS_ORIGINS / CORS_ORIGINS cannot be empty or '*' in production.")
                
            # 5. Fiscal emission guardrail
            if self.HACIENDA_LIVE_EMISSION_ENABLED and not self.HACIENDA_SANDBOX_VALIDATED:
                errors.append("HACIENDA_LIVE_EMISSION_ENABLED cannot be activated in production without prior HACIENDA_SANDBOX_VALIDATED=True.")
                
            if errors:
                error_msg = "\n[CRITICAL STARTUP ERROR] Production configuration validation failed:\n" + "\n".join(f"  - {e}" for e in errors)
                raise RuntimeError(error_msg)

settings = Settings()
