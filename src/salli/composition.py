"""
Composition root — the single place adapters are bound to ports.
Both the CLI (Phase 1) and FastAPI (Phase 2) wire up services here.
"""

from __future__ import annotations

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
    entry_parse: EntryParseService | None


def build_services(settings: Settings, checkpointer=None) -> Services:
    import os

    # LangChain reads API keys directly from os.environ; pydantic-settings
    # loads .env into Settings fields but doesn't populate the process env.
    if settings.anthropic_api_key:
        os.environ.setdefault("ANTHROPIC_API_KEY", settings.anthropic_api_key)
    if settings.tavily_api_key:
        os.environ.setdefault("TAVILY_API_KEY", settings.tavily_api_key)

    session_factory = make_session_factory(settings)

    def uow_factory() -> UnitOfWork:
        return UnitOfWork(session_factory)

    storage = _build_storage(settings)

    ledger = LedgerService(uow_factory)
    tax = TaxService(uow_factory)
    documents = DocumentService(uow_factory, storage)
    fi = FiService(uow_factory)
    profile = UserProfileService(uow_factory, ledger, fi, documents)
    budget = BudgetService(uow_factory)
    debt = DebtService(uow_factory)
    portfolio = PortfolioService(uow_factory)
    subscription = SubscriptionService(uow_factory)
    insurance = InsuranceService(uow_factory)
    fx = CBSLFxRateAdapter()
    billing = BillingService(uow_factory, billing_port=_build_billing(settings))
    advisor = AdvisorService(uow_factory, fi, billing, doc_service=documents)
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
        checkpointer=checkpointer,
        uow_factory=uow_factory,
    )
    parsing = ParsingService(uow_factory, storage)

    # Free-text → draft journal entry (voice/text quick-add). Only available when
    # an Anthropic key is configured; otherwise the /entries/parse route 503s.
    entry_parse: EntryParseService | None = None
    if settings.anthropic_api_key:
        from salli.adapters.llm.anthropic_adapter import AnthropicLLMAdapter

        entry_parse = EntryParseService(
            ledger,
            AnthropicLLMAdapter(settings.anthropic_api_key, settings.langsmith_project),
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
        signing_secret=settings.mcp_signing_secret or settings.supabase_jwt_secret or "dev-insecure-secret",
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
        entry_parse=entry_parse,
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
        price_map={
            "plus:month": settings.paddle_price_plus,
            "plus:year": settings.paddle_price_plus_yearly,
            "pro:month": settings.paddle_price_pro,
            "pro:year": settings.paddle_price_pro_yearly,
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
