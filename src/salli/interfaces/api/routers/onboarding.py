"""
Onboarding router — first-time user setup.

Saves profile facts as agent memories and creates a starter chart of accounts
based on the user's declared income sources.
"""

from __future__ import annotations

from fastapi import APIRouter
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


class OnboardingRequest(BaseModel):
    name: str
    nic: str = ""
    residency: str = "resident"           # "resident" | "non_resident"
    employer: str = ""
    employment_type: str = ""             # "permanent" | "contract" | "self_employed" | "other"
    ird_number: str = ""
    income_sources: list[str] = []        # ["employment","freelance","rental","interest","foreign","dividends"]


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

    for slug, value in memories.items():
        await svc.documents.save_memory(user_id, slug=slug, value=value)

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
