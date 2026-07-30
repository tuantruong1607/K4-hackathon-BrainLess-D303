from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

AGENT_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=AGENT_DIR / ".env", extra="ignore")

    port: int = 8300

    openai_api_key: str = ""
    chat_model: str = "gpt-4o-mini"
    embedding_model: str = "text-embedding-3-small"

    neo4j_uri: str = "bolt://localhost:7687"
    neo4j_user: str = "neo4j"
    neo4j_password: str = "agentgraph123"

    qdrant_path: Path = AGENT_DIR / "data" / "qdrant"
    qdrant_collection: str = "vlearn-slides"

    database_url: str = "postgresql+psycopg2://agent:agentgraph123@localhost:5432/vlearn"

    data_dir: Path = AGENT_DIR / "data" / "raw"

    chunk_size: int = 800
    chunk_overlap: int = 120
    retrieval_top_k: int = 4


settings = Settings()
