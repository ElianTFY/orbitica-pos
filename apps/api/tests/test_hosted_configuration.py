import pytest
from app.core.config import Settings


@pytest.mark.parametrize("scheme", ["postgres", "postgresql", "postgresql+asyncpg", "postgresql+psycopg2"])
def test_hosted_database_url_selects_matching_drivers(monkeypatch, scheme):
    monkeypatch.delenv("SYNC_DATABASE_URL", raising=False)
    suffix = "user:encoded%40password@database.internal:5432/pos"
    settings = Settings(_env_file=None, DATABASE_URL=f"{scheme}://{suffix}")
    assert settings.DATABASE_URL == f"postgresql+asyncpg://{suffix}"
    assert settings.SYNC_DATABASE_URL == f"postgresql://{suffix}"


def test_explicit_sync_database_is_preserved():
    settings = Settings(
        _env_file=None,
        DATABASE_URL="postgres://user:pass@primary.internal/pos",
        SYNC_DATABASE_URL="postgres://user:other@sync.internal/pos",
    )
    assert settings.SYNC_DATABASE_URL == "postgresql://user:other@sync.internal/pos"


def test_storage_configuration_is_loaded_from_host_environment(monkeypatch):
    monkeypatch.setenv("STORAGE_TYPE", "R2")
    monkeypatch.setenv("LOCAL_STORAGE_DIR", "/var/data/uploads")
    monkeypatch.setenv("S3_BUCKET_NAME", "pos-uploads")
    monkeypatch.setenv("S3_ENDPOINT_URL", "https://example.r2.cloudflarestorage.com")
    monkeypatch.setenv("AWS_REGION", "auto")
    monkeypatch.setenv("AWS_ACCESS_KEY_ID", "test-access-key")
    monkeypatch.setenv("AWS_SECRET_ACCESS_KEY", "test-secret-key")
    settings = Settings(_env_file=None)
    assert settings.STORAGE_TYPE == "S3"
    assert settings.LOCAL_STORAGE_DIR == "/var/data/uploads"
    assert settings.S3_BUCKET_NAME == "pos-uploads"
    assert settings.S3_ENDPOINT_URL == "https://example.r2.cloudflarestorage.com"
    assert settings.AWS_REGION == "auto"
    assert settings.AWS_ACCESS_KEY_ID == "test-access-key"
    assert settings.AWS_SECRET_ACCESS_KEY == "test-secret-key"
