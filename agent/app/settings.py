from pathlib import Path
from typing import Literal

from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

from .errors import ConfigurationError


AGENT_DIR = Path(__file__).resolve().parent.parent
REPOSITORY_DIR = AGENT_DIR.parent


class Settings(BaseSettings):
    """Validated source of truth for every runtime dependency."""

    model_config = SettingsConfigDict(
        env_file=(AGENT_DIR / ".env.example", AGENT_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    port: int = 8300
    rag_provider: Literal["mock", "openai"] = "mock"
    rag_vector_store: Literal["memory", "qdrant"] = "memory"
    rag_graph_store: Literal["memory", "neo4j"] = "memory"
    user_context_provider: Literal["mock", "postgres"] = "mock"

    openai_api_key: SecretStr = Field(default=SecretStr(""))
    chat_model: str = "gpt-4o-mini"
    embedding_model: str = "text-embedding-3-small"

    qdrant_url: str = "http://localhost:6333"
    qdrant_collection: str = "slides"
    neo4j_uri: str = "bolt://localhost:7687"
    neo4j_username: str = "neo4j"
    neo4j_password: SecretStr = Field(default=SecretStr(""))
    database_url: SecretStr = Field(default=SecretStr(""))

    rag_data_dir: Path = Path("agent/data/raw")
    retrieval_limit: int = Field(default=5, ge=1, le=100)

    @field_validator(
        "qdrant_url",
        "qdrant_collection",
        "neo4j_uri",
        "neo4j_username",
        mode="before",
    )
    @classmethod
    def strip_live_text_values(cls, value):
        return value.strip() if isinstance(value, str) else value

    @field_validator(
        "openai_api_key",
        "neo4j_password",
        "database_url",
        mode="before",
    )
    @classmethod
    def strip_live_secret_values(cls, value):
        if isinstance(value, SecretStr):
            return SecretStr(value.get_secret_value().strip())
        return value.strip() if isinstance(value, str) else value

    def validate_runtime(self) -> None:
        required: list[tuple[bool, str]] = [
            (
                self.rag_provider == "openai"
                and not self.openai_api_key.get_secret_value().strip(),
                "OPENAI_API_KEY",
            ),
            (
                self.rag_vector_store == "qdrant" and not self.qdrant_url.strip(),
                "QDRANT_URL",
            ),
            (
                self.rag_vector_store == "qdrant"
                and not self.qdrant_collection.strip(),
                "QDRANT_COLLECTION",
            ),
            (
                self.rag_graph_store == "neo4j" and not self.neo4j_uri.strip(),
                "NEO4J_URI",
            ),
            (
                self.rag_graph_store == "neo4j"
                and not self.neo4j_username.strip(),
                "NEO4J_USERNAME",
            ),
            (
                self.rag_graph_store == "neo4j"
                and not self.neo4j_password.get_secret_value().strip(),
                "NEO4J_PASSWORD",
            ),
            (
                self.user_context_provider == "postgres"
                and not self.database_url.get_secret_value().strip(),
                "DATABASE_URL",
            ),
        ]
        missing = [name for is_missing, name in required if is_missing]
        if missing:
            raise ConfigurationError(
                "Missing configuration for selected live providers: "
                + ", ".join(missing)
            )

    @property
    def resolved_rag_data_dir(self) -> Path:
        if self.rag_data_dir.is_absolute():
            return self.rag_data_dir
        return REPOSITORY_DIR / self.rag_data_dir


# Compatibility name for the already-canonical index/store adapters.
RagSettings = Settings
