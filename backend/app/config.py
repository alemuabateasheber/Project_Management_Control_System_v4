from urllib.parse import unquote, urlsplit

from pydantic import ValidationError, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import URL


_KNOWN_PLACEHOLDER_VALUES = frozenset(
    {
        "change_me_in_production",
        "change_this_immediately",
        "change_this_immediately_min_8_chars",
        "change_this_immediately_min_12_chars",
        "replace_with_a_long_random_secret_min_32_chars",
        "replace_with_a_long_random_database_password",
        "replace_with_a_strong_admin_password_min_12_chars",
        "changeme",
        "password",
        "secret",
        "default",
        "mint",
    }
)
_PLACEHOLDER_MARKERS = (
    "replace_with_",
    "change_this_",
    "change-me-",
    "your_",
    "your-",
    "<",
    ">",
)


def _is_placeholder(value: str) -> bool:
    normalized = value.strip().casefold()
    return not normalized or normalized in _KNOWN_PLACEHOLDER_VALUES or any(
        marker in normalized for marker in _PLACEHOLDER_MARKERS
    )


def _validate_secret(value: str, name: str, minimum_length: int) -> str:
    secret = value.strip()
    if _is_placeholder(secret):
        raise ValueError(f"{name} must be replaced with a non-placeholder secret")
    if len(secret) < minimum_length:
        raise ValueError(f"{name} must be at least {minimum_length} characters long")
    if len(set(secret)) < 4:
        raise ValueError(f"{name} must not use a trivially repeated value")
    return secret


def _validate_database_url(value: str) -> str:
    database_url = value.strip()
    try:
        parsed = urlsplit(database_url)
    except ValueError as exc:
        raise ValueError("DATABASE_URL must be a valid PostgreSQL URL") from exc

    if parsed.scheme != "postgresql+psycopg" or not parsed.hostname or not parsed.path.strip("/"):
        raise ValueError("DATABASE_URL must use postgresql+psycopg and include host and database")

    password = unquote(parsed.password or "")
    _validate_secret(password, "DATABASE_URL password", 12)
    return database_url


class Settings(BaseSettings):
    # DATABASE_URL is an optional override for externally managed databases.
    # For Compose and local development, the URL is safely built from the
    # POSTGRES_* values after validation so special characters are encoded.
    database_url: str = ""
    postgres_db: str = "mint_aics_pmo"
    postgres_user: str = "mint"
    postgres_password: str = ""
    postgres_host: str = "db"
    postgres_port: int = 5432

    jwt_secret: str
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = 60
    cors_origins: str = "http://localhost:8081"
    admin_username: str = "admin"
    admin_password: str
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_from: str = ""
    report_dir: str = "/app/reports"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @field_validator("jwt_secret")
    @classmethod
    def validate_jwt_secret(cls, value: str) -> str:
        return _validate_secret(value, "JWT_SECRET", 32)

    @field_validator("admin_password")
    @classmethod
    def validate_admin_password(cls, value: str) -> str:
        return _validate_secret(value, "ADMIN_PASSWORD", 12)

    @field_validator("database_url")
    @classmethod
    def validate_database_url(cls, value: str) -> str:
        return _validate_database_url(value) if value.strip() else ""

    @field_validator("cors_origins")
    @classmethod
    def validate_cors_origins(cls, value: str) -> str:
        origins = [origin.strip() for origin in value.split(",") if origin.strip()]
        if not origins or "*" in origins:
            raise ValueError("CORS_ORIGINS must contain explicit http(s) origins")
        for origin in origins:
            parsed = urlsplit(origin)
            if (
                parsed.scheme not in {"http", "https"}
                or not parsed.netloc
                or parsed.path
                or parsed.query
                or parsed.fragment
            ):
                raise ValueError("CORS_ORIGINS entries must be origin-only http(s) URLs")
        return ",".join(origins)

    @model_validator(mode="after")
    def resolve_database_url(self) -> "Settings":
        if self.database_url:
            return self

        password = _validate_secret(self.postgres_password, "POSTGRES_PASSWORD", 12)
        if not self.postgres_db.strip() or not self.postgres_user.strip() or not self.postgres_host.strip():
            raise ValueError("POSTGRES_DB, POSTGRES_USER, and POSTGRES_HOST must be set")
        if not 1 <= self.postgres_port <= 65535:
            raise ValueError("POSTGRES_PORT must be between 1 and 65535")

        self.database_url = URL.create(
            drivername="postgresql+psycopg",
            username=self.postgres_user,
            password=password,
            host=self.postgres_host,
            port=self.postgres_port,
            database=self.postgres_db,
        ).render_as_string(hide_password=False)
        return self


try:
    settings = Settings()
except ValidationError as exc:
    invalid_fields = ", ".join(str(error["loc"][0]) for error in exc.errors())
    raise RuntimeError(
        f"Configuration error in: {invalid_fields}. "
        "Set non-placeholder values in .env; see .env.example."
    ) from None
