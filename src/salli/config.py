from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # Database
    database_url: str = "postgresql+asyncpg://localhost/salli"

    # Anthropic
    anthropic_api_key: str = ""

    # Supabase
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""
    # JWT secret from Supabase dashboard → Project Settings → API → JWT Secret.
    # When blank, the API accepts any Bearer token and treats it as the user_id
    # (dev-only fallback — never deploy without this set).
    supabase_jwt_secret: str = ""

    # LangSmith (optional)
    langsmith_api_key: str = ""
    langsmith_project: str = "salli"

    # Tavily (web search for agents)
    tavily_api_key: str = ""

    # Billing — Paddle (Merchant of Record)
    paddle_api_key: str = ""
    paddle_webhook_secret: str = ""
    paddle_environment: str = "sandbox"  # "sandbox" | "production"
    # Paddle price IDs map a checkout/subscription back to a plan key.
    paddle_price_plus: str = ""
    paddle_price_pro: str = ""

    # App
    environment: str = "development"
    log_level: str = "INFO"
    base_currency: str = "LKR"


_settings: Settings | None = None


def get_settings() -> Settings:
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings
