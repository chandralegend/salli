"""
Onboarding router — first-time user setup.

`GET /status` and `POST /complete` are the legacy all-in-one flow (still served
unchanged for the current frontend wizard — saves profile facts as agent memories
and creates a starter chart of accounts from declared income sources).

The rest are the focused fact-find steps (Phase 1 redo) backed by
`UserProfileService`/`LedgerService`/`FiService`: identity, opening balance sheet,
income declaration, a scored risk questionnaire, and repeatable goal creation. These
post real journal entries and structured profile columns instead of memory blobs —
a new frontend wizard is a follow-up once these are in place.
"""

from __future__ import annotations

from fastapi import APIRouter, status
from pydantic import BaseModel

from salli.interfaces.api.deps import AppServices, CurrentUser

router = APIRouter(prefix="/onboarding", tags=["onboarding"])

# ── Account templates per income source ───────────────────────────────────────

_BASE_ACCOUNTS = [
    ("1100", "Cash", "asset"),
    ("1200", "Bank Account — LKR", "asset"),
    ("3000", "Opening Equity", "equity"),
    ("5000", "General Expenses", "expense"),
]

_SOURCE_ACCOUNTS: dict[str, list[tuple[str, str, str]]] = {
    "employment": [
        ("4100", "Employment Income", "income"),
        ("4110", "APIT Receivable", "asset"),
    ],
    "freelance": [
        ("4200", "Freelance / Business Income", "income"),
        ("5100", "Business Expenses", "expense"),
    ],
    "rental": [
        ("4300", "Rental Income", "income"),
        ("5200", "Property & Maintenance Expenses", "expense"),
    ],
    "interest": [
        ("4400", "Interest Income", "income"),
        ("4410", "AIT Receivable", "asset"),
    ],
    "foreign": [
        ("1300", "Foreign Currency Account", "asset"),
        ("4500", "Foreign Service Income (FSI)", "income"),
        ("4510", "Foreign Tax Credit Receivable", "asset"),
    ],
    "dividends": [
        ("4600", "Dividend Income", "income"),
    ],
}

_MEMORIES = {
    "onboarding_complete": "true",
}

_GOAL_LABELS = {
    "financial_independence": "Financial Independence",
    "retirement": "Retirement",
    "home": "Buy a home",
    "emergency_fund": "Emergency fund",
    "debt_free": "Become debt-free",
    "wealth_growth": "Grow my wealth",
}


class OnboardingRequest(BaseModel):
    name: str
    nic: str = ""
    residency: str = "resident"  # "resident" | "non_resident"
    employer: str = ""
    employment_type: str = ""  # "permanent" | "contract" | "self_employed" | "other"
    ird_number: str = ""
    income_sources: list[
        str
    ] = []  # ["employment","freelance","rental","interest","foreign","dividends"]
    # Goals & motivation (powers the Wealth Advisor)
    primary_goal: str = ""  # financial_independence | retirement | home | emergency_fund | debt_free | wealth_growth
    goal_target_amount: float = 0  # optional total target (LKR)
    goal_target_year: str = ""  # optional YYYY
    risk_appetite: str = ""  # conservative | balanced | aggressive
    motivation: str = ""  # free text — why this matters to them


class OnboardingStatusResponse(BaseModel):
    complete: bool


@router.get("/status", response_model=OnboardingStatusResponse)
async def get_status(user_id: CurrentUser, svc: AppServices):
    """Check whether the user has completed onboarding."""
    mem = await svc.documents.get_memory(user_id, "onboarding_complete")
    return {"complete": mem is not None}


@router.post("/complete")
async def complete_onboarding(body: OnboardingRequest, user_id: CurrentUser, svc: AppServices):
    """
    Save profile as agent memories and create a starter chart of accounts.
    Idempotent — safe to call again if the user re-runs onboarding.
    """
    # Save profile memories
    memories: dict[str, str] = {
        "onboarding_complete": "true",
        "user_name": body.name,
        "residency_status": body.residency,
    }
    if body.nic:
        memories["nic_number"] = body.nic
    if body.employer:
        memories["employer"] = body.employer
    if body.employment_type:
        memories["employment_type"] = body.employment_type
    if body.ird_number:
        memories["ird_number"] = body.ird_number
    if body.income_sources:
        memories["income_sources"] = ", ".join(body.income_sources)
    if body.primary_goal:
        memories["primary_goal"] = body.primary_goal
    if body.goal_target_amount:
        memories["goal_target_amount"] = str(body.goal_target_amount)
    if body.goal_target_year:
        memories["goal_target_year"] = body.goal_target_year
    if body.risk_appetite:
        memories["risk_appetite"] = body.risk_appetite
    if body.motivation:
        memories["motivation"] = body.motivation

    for slug, value in memories.items():
        await svc.documents.save_memory(user_id, slug=slug, value=value)

    # If they named a concrete target, seed an initial Financial Independence goal.
    if body.primary_goal and body.goal_target_amount > 0:
        try:
            await svc.fi.create_goal(
                user_id,
                {
                    "name": _GOAL_LABELS.get(body.primary_goal, "My goal"),
                    "kind": body.primary_goal,
                    "target_amount": body.goal_target_amount,
                    "target_date": f"{body.goal_target_year}-12-31"
                    if body.goal_target_year
                    else None,
                    "priority": 1,
                },
            )
        except Exception:
            pass

    # Create accounts — skip any that already exist (unique constraint will catch duplicates)
    accounts_to_create = list(_BASE_ACCOUNTS)
    for source in body.income_sources:
        accounts_to_create.extend(_SOURCE_ACCOUNTS.get(source, []))

    # Deduplicate by code
    seen_codes: set[str] = set()
    created: list[str] = []
    skipped: list[str] = []

    existing = await svc.ledger.list_accounts(user_id)
    existing_codes = {a.code for a in existing}

    for code, name, acct_type in accounts_to_create:
        if code in seen_codes or code in existing_codes:
            skipped.append(code)
            continue
        seen_codes.add(code)
        try:
            await svc.ledger.add_account(
                user_id,
                code=code,
                name=name,
                type=acct_type,  # type: ignore[arg-type]
                currency="LKR",
            )
            created.append(f"{code} {name}")
        except Exception:
            skipped.append(code)

    return {
        "memories_saved": list(memories.keys()),
        "accounts_created": created,
        "accounts_skipped": skipped,
    }


# ── Focused fact-find steps (Phase 1 redo) ─────────────────────────────────────


class ProfileIdentityRequest(BaseModel):
    display_name: str | None = None
    date_of_birth: str | None = None  # YYYY-MM-DD
    dependents_count: int | None = None
    employment_status: str | None = None  # employed|self_employed|unemployed|student|retired
    employment_type: str | None = None  # permanent|contract|self_employed|other
    residency_status: str | None = None  # resident|non_resident
    employer: str | None = None
    ird_number: str | None = None


@router.get("/profile")
async def get_profile(user_id: CurrentUser, svc: AppServices):
    """The structured fact-find profile — identity, risk profile, life stage."""
    return await svc.profile.get_profile(user_id)


@router.patch("/profile")
async def update_profile(body: ProfileIdentityRequest, user_id: CurrentUser, svc: AppServices):
    await svc.profile.update_identity(user_id, body.model_dump(exclude_none=True))
    return {"updated": True}


class OpeningBalanceItem(BaseModel):
    code: str
    name: str
    type: str  # asset|liability
    amount: float


class BalanceSheetRequest(BaseModel):
    balances: list[OpeningBalanceItem]


@router.post("/balance-sheet")
async def declare_balance_sheet(body: BalanceSheetRequest, user_id: CurrentUser, svc: AppServices):
    """Post real opening-balance journal entries so net worth is non-zero immediately."""
    entry_ids = await svc.profile.declare_opening_balances(
        user_id, [b.model_dump() for b in body.balances]
    )
    return {"entries_created": entry_ids}


class IncomeItem(BaseModel):
    code: str
    name: str
    amount: float
    deposit_account_code: str | None = None
    deposit_account_name: str | None = None


class IncomeDeclarationRequest(BaseModel):
    incomes: list[IncomeItem]


@router.post("/income")
async def declare_income(body: IncomeDeclarationRequest, user_id: CurrentUser, svc: AppServices):
    """Post one representative monthly entry per declared income source."""
    entry_ids = await svc.profile.declare_income(
        user_id, [i.model_dump(exclude_none=True) for i in body.incomes]
    )
    return {"entries_created": entry_ids}


class RiskQuestionnaireRequest(BaseModel):
    time_horizon_years: int
    drawdown_reaction: str  # sell_all|sell_some|hold|buy_more
    income_stability: str  # unstable|moderate|stable
    investment_experience: str  # none|some|experienced
    dependents_count: int = 0


@router.post("/risk-questionnaire")
async def submit_risk_questionnaire(
    body: RiskQuestionnaireRequest, user_id: CurrentUser, svc: AppServices
):
    """Score the risk-tolerance questionnaire and persist score/category/life-stage."""
    return await svc.profile.submit_risk_questionnaire(user_id, body.model_dump())


class OnboardingGoalItem(BaseModel):
    name: str
    kind: str = "custom"
    target_amount: float = 0
    current_amount: float = 0
    target_date: str | None = None
    priority: int = 2


class GoalsRequest(BaseModel):
    goals: list[OnboardingGoalItem]


@router.post("/goals", status_code=status.HTTP_201_CREATED)
async def declare_goals(body: GoalsRequest, user_id: CurrentUser, svc: AppServices):
    """Create one or more goals — repeatable, unlike the legacy single-goal flow."""
    goal_ids = [await svc.fi.create_goal(user_id, g.model_dump()) for g in body.goals]
    return {"goal_ids": goal_ids}
