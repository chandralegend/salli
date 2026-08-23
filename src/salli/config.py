from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # Database
    database_url: str = "postgresql+asyncpg://localhost/salli"

    # Anthropic
    anthropic_api_key: str = ""

    # OpenAI — used only for speech-to-text transcription (mobile Voice Mode).
    # The agent itself never calls OpenAI; this key powers /agent/transcribe alone.
    openai_api_key: str = ""

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
    # Paddle price IDs map a checkout/subscription back to a plan key + billing cycle.
    paddle_price_plus: str = ""  # Starter monthly
    paddle_price_pro: str = ""  # Pro monthly
    paddle_price_plus_yearly: str = ""  # Starter yearly
    paddle_price_pro_yearly: str = ""  # Pro yearly

    # Issue tracker — Jira Cloud. User-submitted bug reports are mirrored here.
    # Leave blank and reports are still stored in Salli, with push_status "skipped".
    jira_base_url: str = ""  # e.g. "https://leafmonkey.atlassian.net"
    jira_email: str = ""  # the account the API token belongs to
    jira_api_token: str = ""
    jira_project_key: str = ""
    jira_issue_type: str = "Bug"

    # Daily Wealth Advisor scheduling (Supabase pg_cron calls the API)
    cron_secret: str = ""
    advisor_api_base_url: str = "http://localhost:8000"

    # MCP server — lets external AI clients (Claude, ChatGPT, etc.) connect to a
    # user's Salli account via OAuth 2.1 + Dynamic Client Registration.
    mcp_public_base_url: str = "http://localhost:8000"  # this API, as seen by MCP clients
    app_base_url: str = "http://localhost:3000"  # the Next.js web app (consent screen lives here)
    # Signs the short-lived "pending authorization" token handed to the web app's
    # consent screen. Falls back to the Supabase JWT secret in dev so a fresh
    # checkout works without extra config — set a real random value in production.
    mcp_signing_secret: str = ""
    # Pending-authorization token TTL — generous because the consent screen
    # usually sits behind a login (or first-time signup) redirect.
    mcp_art_ttl_seconds: int = 1800
    mcp_auth_code_ttl_seconds: int = 120
    mcp_access_token_ttl_seconds: int = 3600
    mcp_refresh_token_ttl_seconds: int = 60 * 60 * 24 * 30

    # CORS — comma-separated list of allowed origins in production.
    # Defaults cover app + marketing site (both the leafmonkey.org subdomains and
    # the legacy salli.lk domain); override via ALLOWED_ORIGINS env var.
    allowed_origins: list[str] = [
        "https://app.salli.leafmonkey.org",
        "https://salli.leafmonkey.org",
        "https://app.salli.lk",
        "https://salli.lk",
    ]

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
