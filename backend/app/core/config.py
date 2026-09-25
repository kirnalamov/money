from typing import List, Union
from pydantic import AnyHttpUrl, PostgresDsn, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "Money App"
    API_V1_STR: str = "/api/v1"
    DEV_MODE: bool = False
    
    # Security
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 60
    AUTH_RATE_LIMIT_PER_MINUTE: int = 5
    
    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "console"  # "console" or "json"

    # Exchange rates
    EXCHANGE_RATES_URL: str = "https://open.er-api.com/v6/latest/USD"
    EXCHANGE_RATES_TTL_MINUTES: int = 60
    
    # Initial Superuser (optional)
    FIRST_SUPERUSER_EMAIL: str | None = None
    FIRST_SUPERUSER_USERNAME: str | None = None
    FIRST_SUPERUSER_PASSWORD: str | None = None
    FIRST_SUPERUSER_FULL_NAME: str | None = None
    
    # CORS
    BACKEND_CORS_ORIGINS: List[AnyHttpUrl] = []

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, list):
            return v
        elif isinstance(v, str):
            return [v]
        raise ValueError(v)

    @field_validator("SECRET_KEY")
    def validate_secret_key(cls, v: str) -> str:
        if len(v) < 32 or v in {
            "CHANGE_THIS_IN_PRODUCTION_TO_A_RANDOM_SECRET_KEY",
            "dev-secret-key-CHANGE-IN-PRODUCTION-use-openssl-rand-hex-32",
            "replace_with_a_random_secret_at_least_32_characters_long",
        }:
            raise ValueError("SECRET_KEY must be a random value of at least 32 characters")
        return v

    # Database
    POSTGRES_SERVER: str
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str
    DATABASE_URL: Union[PostgresDsn, str] | None = None

    @field_validator("DATABASE_URL", mode="before")
    def assemble_db_connection(cls, v: Union[str, None], info) -> Union[AnyHttpUrl, str]:
        if isinstance(v, str):
            return v
        
        # If any Postgres field is missing and we don't have a URL, ensure we don't crash if we want SQLite
        # But here we are building PostgresDSN by default.
        return PostgresDsn.build(
            scheme="postgresql+asyncpg",
            username=info.data.get("POSTGRES_USER"),
            password=info.data.get("POSTGRES_PASSWORD"),
            host=info.data.get("POSTGRES_SERVER"),
            path=f"{info.data.get('POSTGRES_DB') or ''}",
        ).unicode_string()

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)

settings = Settings()  # type: ignore
