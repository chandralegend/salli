"""
Composition root — the single place adapters are bound to ports.
Both the CLI (Phase 1) and FastAPI (Phase 2) wire up services here.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass

from salli.adapters.db.session import make_session_factory
from salli.adapters.fx.cbsl import CBSLFxRateAdapter
from salli.application.ports import StoragePort
from salli.application.services.advisor_service import AdvisorService
from salli.application.services.agent_service import AgentService
from salli.application.services.billing_service import BillingService
from salli.application.services.budget_service import BudgetService
from salli.application.services.bug_report_service import BugReportService
from salli.application.services.data_portability_service import DataPortabilityService
from salli.application.services.debt_service import DebtService
from salli.application.services.document_service import DocumentService
from salli.application.services.entry_parse_service import EntryParseService
from salli.application.services.fi_service import FiService
from salli.application.services.insurance_service import InsuranceService
from salli.application.services.ledger_service import LedgerService
from salli.application.services.llm_credential_service import LlmCredentialService
from salli.application.services.mcp_oauth_service import McpOAuthService
from salli.application.services.parsing_service import ParsingService
from salli.application.services.portfolio_service import PortfolioService
from salli.application.services.reminder_service import ReminderService
from salli.application.services.report_service import ReportService
from salli.application.services.subscription_service import SubscriptionService
from salli.application.services.tax_service import TaxService
from salli.application.services.user_profile_service import UserProfileService
from salli.application.unit_of_work import UnitOfWork
from salli.config import Settings


@dataclass
class Services:
    ledger: LedgerService
    tax: TaxService
    agent: AgentService
    parsing: ParsingService
    reminders: ReminderService
    fx: CBSLFxRateAdapter
    storage: StoragePort
    documents: DocumentService
    billing: BillingService
    fi: FiService
    advisor: AdvisorService
    profile: UserProfileService
    budget: BudgetService
    debt: DebtService
    portfolio: PortfolioService
    subscription: SubscriptionService
    insurance: InsuranceService
    reports: ReportService
    bug_reports: BugReportService
    data_portability: DataPortabilityService
    mcp_oauth: McpOAuthService
    llm_credentials: LlmCredentialService
    # Not optional any more: availability is per-user, decided at call time.
    entry_parse: EntryParseService


def build_services(settings: Settings, checkpointer=None) -> Services:
    import os

    # ANTHROPIC_API_KEY is deliberately NOT seeded into os.environ. Every model
    # is now constructed with an explicit key (see domain/agents/model_factory),
    # and while that env var is set ChatAnthropic would silently fall back to it
    # — so any construction site we missed would quietly bill the platform for a
    # user who is supposed to be paying their own way. Leaving it unset turns
    # such a miss into a loud failure instead.
    #
    # Tavily still reads the environment: its LangChain tool has no key
    # parameter, and web search is a platform capability, not a per-user one.
    if settings.tavily_api_key:
        os.environ.setdefault("TAVILY_API_KEY", settings.tavily_api_key)

    session_factory = make_session_factory(settings)

    def uow_factory() -> UnitOfWork:
        return UnitOfWork(session_factory)

    storage = _build_storage(settings)
    llm_credentials = _build_llm_credentials(settings, uow_factory)

    ledger = LedgerService(uow_factory)
    tax = TaxService(uow_factory)
    documents = DocumentService(uow_factory, storage)
    fi = FiService(uow_factory, llm_credentials)
    profile = UserProfileService(uow_factory, ledger, fi, documents)
    budget = BudgetService(uow_factory)
    debt = DebtService(uow_factory)
    portfolio = PortfolioService(uow_factory)
    subscription = SubscriptionService(uow_factory)
    insurance = InsuranceService(uow_factory)
    fx = CBSLFxRateAdapter()
    billing = BillingService(
        uow_factory, billing_port=_build_billing(settings), credentials=llm_credentials
    )
    advisor = AdvisorService(
        uow_factory, fi, billing, doc_service=documents, credentials=llm_credentials
    )
    agent = AgentService(
        ledger,
        tax,
        documents,
        profile,
        budget,
        debt,
        portfolio,
        subscription,
        insurance,
        advisor,
        fi,
        checkpointer=checkpointer,
        uow_factory=uow_factory,
    )
    parsing = ParsingService(uow_factory, storage, llm_credentials)

    # Free-text → draft journal entry (voice/text quick-add) and Voice Mode
    # speech-to-text. Both are now always constructed: which key they run on is
    # resolved per request, so a user with their own key gets the feature even
    # where no platform key exists. Previously both were None unless a platform
    # key was configured, which 503'd exactly the users BYOK is for.
    from salli.adapters.llm.anthropic_adapter import AnthropicLLMAdapter

    entry_parse = EntryParseService(
        ledger,
        lambda key: AnthropicLLMAdapter(key, settings.langsmith_project),
        credentials=llm_credentials,
    )

    reminders = ReminderService(uow_factory, budget, subscription, insurance)
    bug_reports = BugReportService(
        uow_factory,
        tracker=_build_tracker(settings),
        documents=documents,
        api_version="0.1.0",
        environment=settings.environment,
    )
    reports = ReportService(ledger, fi)
    mcp_oauth = McpOAuthService(
        uow_factory,
        signing_secret=settings.mcp_signing_secret
        or settings.supabase_jwt_secret
        or "dev-insecure-secret",
        mcp_resource_url=f"{settings.mcp_public_base_url.rstrip('/')}/mcp",
        app_base_url=settings.app_base_url,
        art_ttl_seconds=settings.mcp_art_ttl_seconds,
        auth_code_ttl_seconds=settings.mcp_auth_code_ttl_seconds,
        access_token_ttl_seconds=settings.mcp_access_token_ttl_seconds,
        refresh_token_ttl_seconds=settings.mcp_refresh_token_ttl_seconds,
        billing_service=billing,
    )
    data_portability = DataPortabilityService(
        uow_factory,
        profile,
        ledger,
        tax,
        budget,
        debt,
        portfolio,
        subscription,
        insurance,
        fi,
        advisor,
        documents,
        reminders,
        bug_reports,
    )

    return Services(
        ledger=ledger,
        tax=tax,
        agent=agent,
        parsing=parsing,
        reminders=reminders,
        fx=fx,
        storage=storage,
        documents=documents,
        billing=billing,
        fi=fi,
        advisor=advisor,
        profile=profile,
        budget=budget,
        debt=debt,
        portfolio=portfolio,
        subscription=subscription,
        insurance=insurance,
        reports=reports,
        bug_reports=bug_reports,
        data_portability=data_portability,
        mcp_oauth=mcp_oauth,
        llm_credentials=llm_credentials,
        entry_parse=entry_parse,
    )


def _build_llm_credentials(settings: Settings, uow_factory) -> LlmCredentialService:
    """Always constructed; `available` decides whether users may supply keys.

    Two gates, both of which must hold, and both of which fail *closed*:

    1. An encryption key is configured. Without one there is nowhere safe to put
       a user's key, and storing plaintext is not an acceptable fallback.
    2. Auth is real. `deps._decode_jwt` falls back to treating the bearer token
       *as* the user id when Supabase is entirely unconfigured — today that is a
       documented local-dev convenience, but with BYOK it would let any caller
       name an arbitrary user id and spend that user's key. So BYOK stays off
       whenever that fallback is live.
    """
    from salli.adapters.crypto.keyring import KeyRing
    from salli.adapters.llm.key_check import validate_provider_key

    auth_is_real = bool(settings.supabase_url or settings.supabase_jwt_secret)
    if not auth_is_real and settings.byok_encryption_keys:
        logging.getLogger(__name__).warning(
            "BYOK is disabled: an encryption key is configured but authentication "
            "is not, so any bearer token would be accepted as a user id."
        )

    return LlmCredentialService(
        uow_factory,
        KeyRing(settings.byok_encryption_keys),
        platform_anthropic_key=settings.anthropic_api_key,
        validator=validate_provider_key,
        feature_enabled=auth_is_real,
    )


def _build_billing(settings: Settings):
    """Return a Paddle adapter when configured, else None (entitlements/metering still work)."""
    if not settings.paddle_api_key:
        return None
    from salli.adapters.billing.paddle import PaddleBillingAdapter

    return PaddleBillingAdapter(
        api_key=settings.paddle_api_key,
        webhook_secret=settings.paddle_webhook_secret,
        environment=settings.paddle_environment,
        # Only live plans belong here. While "plus" was still mapped, a client
        # posting {"plan": "plus"} to /billing/checkout would have opened a real
        # Paddle checkout for the retired tier — and the subscription it created
        # would store plan="plus", which get_plan() resolves to Free. The user
        # pays and receives the free allowance.
        price_map={
            "pro:month": settings.paddle_price_pro,
            "pro:year": settings.paddle_price_pro_yearly,
        },
        # pack name -> (price id, credits granted)
        credit_packs={
            "10k": (settings.paddle_price_credits_10k, 10_000),
            "25k": (settings.paddle_price_credits_25k, 25_000),
            "60k": (settings.paddle_price_credits_60k, 60_000),
        },
    )


def _build_tracker(settings: Settings):
    """
    Return a Jira adapter when configured, else None.

    None is a supported state, not a degraded one: BugReportService stores every
    report either way and records push_status="skipped", so bug reporting works
    before any tracker credentials exist.
    """
    if not (settings.jira_base_url and settings.jira_email and settings.jira_api_token):
        return None
    from salli.adapters.tracker.jira import JiraIssueTrackerAdapter

    return JiraIssueTrackerAdapter(
        base_url=settings.jira_base_url,
        email=settings.jira_email,
        api_token=settings.jira_api_token,
        project_key=settings.jira_project_key,
        issue_type=settings.jira_issue_type,
    )


def _build_storage(settings: Settings) -> StoragePort:
    if settings.supabase_url and settings.supabase_service_role_key:
        from salli.adapters.storage.supabase import SupabaseStorageAdapter

        return SupabaseStorageAdapter(settings.supabase_url, settings.supabase_service_role_key)
    from salli.adapters.storage.local import LocalStorageAdapter

    return LocalStorageAdapter()
