"""
Unit of work — wraps a single DB transaction.
Both the CLI and the API use this to ensure all writes in a use-case commit together.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from salli.adapters.db.repositories import (
    SQLAdvisoryRepository,
    SQLAgentDocumentRepository,
    SQLAgentSessionRepository,
    SQLAuditLogRepository,
    SQLBudgetRepository,
    SQLBugReportRepository,
    SQLDataPortabilityRepository,
    SQLDebtRepository,
    SQLFireStrategyRepository,
    SQLFiScoreRepository,
    SQLGoalRepository,
    SQLInsuranceTargetRepository,
    SQLLedgerRepository,
    SQLLlmCredentialRepository,
    SQLOAuthClientRepository,
    SQLOAuthTokenRepository,
    SQLPolicyRepository,
    SQLPortfolioRepository,
    SQLRecurringSubscriptionRepository,
    SQLReminderRepository,
    SQLStatementRepository,
    SQLSubscriptionRepository,
    SQLTaxComputationRepository,
    SQLUsageRepository,
    SQLUserProfileRepository,
)
from salli.application.ports import (
    AdvisoryRepository,
    AgentDocumentRepository,
    AgentSessionRepository,
    AuditLogRepository,
    BudgetRepository,
    BugReportRepository,
    DataPortabilityRepository,
    DebtRepository,
    FireStrategyRepository,
    FiScoreRepository,
    GoalRepository,
    InsuranceTargetRepository,
    LedgerRepository,
    LlmCredentialRepository,
    OAuthClientRepository,
    OAuthTokenRepository,
    PolicyRepository,
    PortfolioRepository,
    RecurringSubscriptionRepository,
    ReminderRepository,
    StatementRepository,
    SubscriptionRepository,
    TaxComputationRepository,
    UsageRepository,
    UserProfileRepository,
)

if TYPE_CHECKING:
    pass


class UnitOfWork:
    ledger: LedgerRepository
    tax_computations: TaxComputationRepository
    statements: StatementRepository
    reminders: ReminderRepository
    agent_documents: AgentDocumentRepository
    agent_sessions: AgentSessionRepository
    subscriptions: SubscriptionRepository
    usage: UsageRepository
    user_profiles: UserProfileRepository
    goals: GoalRepository
    fi_scores: FiScoreRepository
    advisories: AdvisoryRepository
    fire_strategies: FireStrategyRepository
    budgets: BudgetRepository
    debts: DebtRepository
    holdings: PortfolioRepository
    recurring_subscriptions: RecurringSubscriptionRepository
    policies: PolicyRepository
    insurance_targets: InsuranceTargetRepository
    audit_log: AuditLogRepository
    bug_reports: BugReportRepository
    data_portability: DataPortabilityRepository
    oauth_clients: OAuthClientRepository
    oauth_tokens: OAuthTokenRepository
    llm_credentials: LlmCredentialRepository

    def __init__(self, session_factory: async_sessionmaker[AsyncSession]) -> None:
        self._factory = session_factory
        self._session: AsyncSession | None = None

    async def __aenter__(self) -> UnitOfWork:
        self._session = self._factory()
        self.ledger = SQLLedgerRepository(self._session)
        self.tax_computations = SQLTaxComputationRepository(self._session)
        self.statements = SQLStatementRepository(self._session)
        self.reminders = SQLReminderRepository(self._session)
        self.agent_documents = SQLAgentDocumentRepository(self._session)
        self.agent_sessions = SQLAgentSessionRepository(self._session)
        self.subscriptions = SQLSubscriptionRepository(self._session)
        self.usage = SQLUsageRepository(self._session)
        self.user_profiles = SQLUserProfileRepository(self._session)
        self.goals = SQLGoalRepository(self._session)
        self.fi_scores = SQLFiScoreRepository(self._session)
        self.advisories = SQLAdvisoryRepository(self._session)
        self.fire_strategies = SQLFireStrategyRepository(self._session)
        self.budgets = SQLBudgetRepository(self._session)
        self.debts = SQLDebtRepository(self._session)
        self.holdings = SQLPortfolioRepository(self._session)
        self.recurring_subscriptions = SQLRecurringSubscriptionRepository(self._session)
        self.policies = SQLPolicyRepository(self._session)
        self.insurance_targets = SQLInsuranceTargetRepository(self._session)
        self.audit_log = SQLAuditLogRepository(self._session)
        self.bug_reports = SQLBugReportRepository(self._session)
        self.data_portability = SQLDataPortabilityRepository(self._session)
        self.oauth_clients = SQLOAuthClientRepository(self._session)
        self.oauth_tokens = SQLOAuthTokenRepository(self._session)
        self.llm_credentials = SQLLlmCredentialRepository(self._session)
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb) -> None:
        assert self._session is not None
        if exc_type is None:
            await self._session.commit()
        else:
            await self._session.rollback()
        await self._session.close()

    async def commit(self) -> None:
        assert self._session is not None
        await self._session.commit()
