#!/usr/bin/env python3
"""
Comprehensive realistic seed data for the Salli dev user (AY 2025/26).

Covers: salary, FD interest, foreign service income (USD remittances), local
freelance, rental income, all day-to-day expenses, big purchases, subscriptions,
healthcare, travel, business expenses, qualifying donations, tax installments,
prior-year tax settlement, and filing reminders.

Usage:
    cd /home/chandra/Documents/personal/salli
    uv run python scripts/seed_dev_data.py
"""

from __future__ import annotations

import asyncio
import calendar
import os
import sys
from datetime import date as date_cls
from decimal import Decimal

import httpx
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

# ── Config (env-overridable) ──────────────────────────────────────────────────
# App DB now lives on local Supabase Postgres (host port 54322).
DB_URL       = os.environ.get("SEED_DB_URL", "postgresql+asyncpg://postgres:postgres@localhost:54322/postgres")
API          = os.environ.get("SEED_API", "http://localhost:8080")
SUPABASE_URL = os.environ.get("SEED_SUPABASE_URL", "http://localhost:54321")
SUPABASE_ANON = os.environ.get(
    "SEED_SUPABASE_ANON",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0",
)
SEED_EMAIL    = os.environ.get("SEED_EMAIL", "founder@salli.lk")
SEED_PASSWORD = os.environ.get("SEED_PASSWORD", "supersecret123")
# When set, skip Supabase auth entirely and use this as both token and user_id.
# Required when running without a local Supabase stack (the API dev fallback
# accepts any Bearer value as the user_id when SUPABASE_URL/JWT_SECRET are empty).
SEED_TOKEN = os.environ.get("SEED_TOKEN", "")
# When set, skip the direct-Postgres cleanup pass entirely — for targets (e.g.
# production) where only the public HTTPS API + Supabase anon key are available,
# with no direct DB connection string. Safe for a first-time seed of a fresh account.
SEED_SKIP_CLEAR = os.environ.get("SEED_SKIP_CLEAR", "") == "1"

# Legacy identity whose data should always be purged on reseed
LEGACY_USER = "dev-user"

engine  = create_async_engine(DB_URL, echo=False)
Session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


def _sub_from_jwt(token: str) -> str:
    """Decode the `sub` (user_id) from a JWT without verifying."""
    import base64
    import json

    payload = token.split(".")[1]
    payload += "=" * (-len(payload) % 4)
    return json.loads(base64.urlsafe_b64decode(payload))["sub"]


def get_auth() -> tuple[str, str]:
    """Sign in (creating the user if needed) and return (access_token, user_id)."""
    with httpx.Client(base_url=SUPABASE_URL, headers={"apikey": SUPABASE_ANON}) as c:
        r = c.post("/auth/v1/token", params={"grant_type": "password"},
                   json={"email": SEED_EMAIL, "password": SEED_PASSWORD})
        if r.status_code != 200:
            # user may not exist yet — sign them up
            c.post("/auth/v1/signup", json={"email": SEED_EMAIL, "password": SEED_PASSWORD})
            r = c.post("/auth/v1/token", params={"grant_type": "password"},
                       json={"email": SEED_EMAIL, "password": SEED_PASSWORD})
        r.raise_for_status()
        token = r.json()["access_token"]
    return token, _sub_from_jwt(token)


# ── DB cleanup ────────────────────────────────────────────────────────────────

async def clear_user_data(user_ids: list[str]) -> None:
    print(f"⟳  Clearing existing data for: {', '.join(user_ids)}…")
    async with Session() as s:
        async with s.begin():
            for uid in user_ids:
                # Break self-reference and cross-table FKs before deletes
                await s.execute(text(
                    "UPDATE journal_entries SET reversed_by = NULL WHERE user_id = :u"
                ), {"u": uid})
                await s.execute(text(
                    "UPDATE parsed_transactions SET posted_entry_id = NULL "
                    "WHERE posted_entry_id IN (SELECT id FROM journal_entries WHERE user_id = :u)"
                ), {"u": uid})
                # Delete in dependency order
                await s.execute(text("DELETE FROM tax_computations WHERE user_id = :u"), {"u": uid})
                await s.execute(text(
                    "DELETE FROM parsed_transactions WHERE statement_id IN "
                    "(SELECT id FROM statements WHERE user_id = :u)"
                ), {"u": uid})
                await s.execute(text("DELETE FROM statements      WHERE user_id = :u"), {"u": uid})
                await s.execute(text("DELETE FROM journal_entries WHERE user_id = :u"), {"u": uid})
                await s.execute(text("DELETE FROM accounts        WHERE user_id = :u"), {"u": uid})
                await s.execute(text("DELETE FROM reminders       WHERE user_id = :u"), {"u": uid})
                await s.execute(text("DELETE FROM budgets         WHERE user_id = :u"), {"u": uid})
                await s.execute(text("DELETE FROM debts           WHERE user_id = :u"), {"u": uid})
                await s.execute(text("DELETE FROM holdings        WHERE user_id = :u"), {"u": uid})
                await s.execute(text("DELETE FROM documents       WHERE user_id = :u"), {"u": uid})
                await s.execute(text("DELETE FROM agent_documents WHERE user_id = :u"), {"u": uid})
                await s.execute(text("DELETE FROM agent_sessions  WHERE user_id = :u"), {"u": uid})
                # Agent conversation checkpoints are keyed "<user_id>:<thread>"
                for tbl in ("checkpoint_writes", "checkpoint_blobs", "checkpoints"):
                    await s.execute(text(f"DELETE FROM {tbl} WHERE thread_id LIKE :p"), {"p": f"{uid}:%"})
    print("✓  Cleared\n")


# ── Helpers ───────────────────────────────────────────────────────────────────

_accts: dict[str, str] = {}   # code → id
_entry_count = 0


async def mkacct(client: httpx.AsyncClient, code: str, name: str,
                  acct_type: str, currency: str = "LKR") -> None:
    r = await client.post("/accounts/", json={
        "code": code, "name": name, "type": acct_type, "currency": currency,
    })
    r.raise_for_status()
    _accts[code] = r.json()["id"]


Posting = tuple  # (code, direction, amount_str, currency="LKR", fx_rate="1")


async def entry(
    client: httpx.AsyncClient,
    date: str,
    desc: str,
    postings: list[Posting],
    source: str = "manual",
) -> str | None:
    global _entry_count
    payload_postings = []
    for p in postings:
        code      = p[0]
        direction = p[1]
        amount    = str(p[2])
        currency  = p[3] if len(p) > 3 else "LKR"
        fx_rate   = str(p[4]) if len(p) > 4 else "1"
        payload_postings.append({
            "account_id": _accts[code],
            "direction":  direction,
            "amount":     amount,
            "currency":   currency,
            "fx_rate":    fx_rate,
        })
    r = await client.post("/entries/", json={
        "entry_date": date,
        "description": desc,
        "source": source,
        "postings": payload_postings,
    })
    if not r.is_success:
        print(f"  ✗ FAILED [{date}] {desc[:60]}: {r.text[:120]}", file=sys.stderr)
        return None
    _entry_count += 1
    return r.json()["id"]


async def remind(client: httpx.AsyncClient, kind: str, due_date: str) -> str:
    r = await client.post("/reminders/", json={"kind": kind, "due_date": due_date})
    r.raise_for_status()
    return r.json()["id"]


async def mkdebt(client: httpx.AsyncClient, name: str, principal: float,
                  apr: float, minimum_payment: float) -> None:
    # apr is a fraction, e.g. 0.115 for 11.5%.
    r = await client.post("/debt/", json={
        "name": name, "principal": principal, "apr": apr,
        "minimum_payment": minimum_payment,
    })
    r.raise_for_status()


async def mkholding(client: httpx.AsyncClient, symbol: str, name: str,
                     asset_class: str, cost_basis: float, current_value: float) -> None:
    r = await client.post("/portfolio/", json={
        "symbol": symbol, "name": name, "asset_class": asset_class,
        "cost_basis": cost_basis, "current_value": current_value,
    })
    r.raise_for_status()


async def mkbudget(client: httpx.AsyncClient, period_start: str, period_end: str,
                    lines: list[tuple[str, float]]) -> None:
    # lines are (account_code, limit_amount); resolved to account ids here.
    r = await client.post("/budget/", json={
        "period_start": period_start,
        "period_end": period_end,
        "lines": [{"account_id": _accts[code], "limit_amount": amt} for code, amt in lines],
    })
    r.raise_for_status()


# ── Main seed ─────────────────────────────────────────────────────────────────

async def seed(token: str) -> None:
    headers = {"Authorization": f"Bearer {token}"}
    async with httpx.AsyncClient(base_url=API, headers=headers, timeout=30.0) as client:

        # ── 1. Accounts ───────────────────────────────────────────────────────
        print("── Creating accounts ──────────────────────────────────────────")

        # Assets
        await mkacct(client, "1000", "Commercial Bank – Savings (LKR)", "asset")
        await mkacct(client, "1001", "People's Bank – Current (LKR)",   "asset")
        await mkacct(client, "1002", "Fixed Deposit – People's Bank 5M","asset")
        await mkacct(client, "1003", "HSBC – USD Account",              "asset", "USD")

        # Liabilities
        await mkacct(client, "2000", "APIT Payable",         "liability")
        await mkacct(client, "2010", "AIT Withheld",         "liability")
        await mkacct(client, "2020", "Foreign Tax Credit",   "liability")
        await mkacct(client, "2030", "Credit Card – Visa Infinite", "liability")

        # Equity
        await mkacct(client, "3000", "Retained Earnings", "equity")

        # Income
        await mkacct(client, "4000", "Employment Income",             "income")
        await mkacct(client, "4010", "Interest Income – Fixed Deposit","income")
        await mkacct(client, "4015", "Interest Income – Savings",      "income")
        await mkacct(client, "4020", "Foreign Service Income",         "income")  # 15% final
        await mkacct(client, "4030", "Freelance Income",               "income")
        await mkacct(client, "4040", "Rental Income",                  "income")

        # Expenses
        await mkacct(client, "5000", "Rent",                          "expense")
        await mkacct(client, "5010", "Electricity – CEB",             "expense")
        await mkacct(client, "5020", "Water – NWSDB",                 "expense")
        await mkacct(client, "5030", "Internet & Mobile – Dialog",    "expense")
        await mkacct(client, "5040", "Groceries & Supermarket",       "expense")
        await mkacct(client, "5050", "Dining & Entertainment",        "expense")
        await mkacct(client, "5060", "Transport & Fuel",              "expense")
        await mkacct(client, "5070", "Healthcare & Medicine",         "expense")
        await mkacct(client, "5080", "Education & Certifications",    "expense")
        await mkacct(client, "5090", "Insurance – Life (AIA)",        "expense")
        await mkacct(client, "5091", "Insurance – Health (Ceylinco)", "expense")
        await mkacct(client, "5100", "Subscriptions & Streaming",     "expense")
        await mkacct(client, "5110", "Clothing & Personal Care",      "expense")
        await mkacct(client, "5120", "Electronics & Equipment",       "expense")
        await mkacct(client, "5130", "Travel & Accommodation",        "expense")
        await mkacct(client, "5140", "IRD Tax Installments",          "expense")
        await mkacct(client, "5150", "Qualifying Donations",          "expense")  # tax-deductible
        await mkacct(client, "5160", "Business Expenses",             "expense")
        await mkacct(client, "5170", "Bank Charges & FX Fees",        "expense")
        await mkacct(client, "5180", "Prior Year Tax Settlement",     "expense")

        print(f"✓  {len(_accts)} accounts\n")

        # ── 2. Journal entries ────────────────────────────────────────────────
        print("── Creating journal entries ───────────────────────────────────")

        # AY 2025/26 period data ─────────────────────────────────────────────

        # Monthly base dates (salary pay day = 26th)
        months = [
            "2025-04", "2025-05", "2025-06", "2025-07",
            "2025-08", "2025-09", "2025-10", "2025-11",
            "2025-12", "2026-01", "2026-02", "2026-03",
        ]

        # Variable monthly amounts (index 0=Apr … 11=Mar)
        elec   = [9200,11500,10800,11200,12800,11500,10200, 9800,10500,11800,10200, 9500]
        groc   = [34500,37200,36800,38500,35900,39100,37600,41200,45300,36800,38200,40500]
        dining = [22000,25500,28000,31000,24000,26500,23000,27000,38000,22000,24500,29000]
        transp = [14500,15200,16800,13900,15600,17200,14800,16100,15400,14200,15800,16900]
        health = [    0, 5200,    0,12500, 8900,    0, 4500,    0, 7800,15200,    0, 6300]
        sav_i  = [3200, 3350, 3500, 3650, 3800, 3950, 4100, 4250, 4400, 4550, 4700, 4850]

        # ── Prior-year tax settlement (first entry, April 2025) ──
        await entry(client, "2025-04-10",
            "AY 2024/25 – Final income tax settlement (IRD balance)", [
            ("5180",  1, "85000.00"),
            ("1001", -1, "85000.00"),
        ])

        # ── Annual life insurance premium (June) ──
        await entry(client, "2025-06-01",
            "AIA Life Insurance – Annual premium 2025/26", [
            ("5090",  1, "45000.00"),
            ("1001", -1, "45000.00"),
        ])

        # ── Qualifying donation (July) ──
        await entry(client, "2025-07-15",
            "Sarvodaya Shramadana – Charitable donation (approved)", [
            ("5150",  1, "50000.00"),
            ("1001", -1, "50000.00"),
        ])

        # ── Big purchases ──
        await entry(client, "2025-06-10",
            "Apple MacBook Pro 14\" M3 – Apple Premium Reseller Colombo", [
            ("5120",  1, "455000.00"),
            ("1001", -1, "455000.00"),
        ])
        await entry(client, "2025-09-05",
            "Vehicle service & parts – Toyota Corolla (Stafford Motors)", [
            ("5060",  1, "85000.00"),
            ("1001", -1, "85000.00"),
        ])
        await entry(client, "2025-12-20",
            "LG 65\" OLED TV C3 – Singer Sri Lanka (festive season)", [
            ("5120",  1, "385000.00"),
            ("1001", -1, "385000.00"),
        ])
        await entry(client, "2026-02-14",
            "iPhone 16 Pro Max – iStore Colombo", [
            ("5120",  1, "295000.00"),
            ("1001", -1, "295000.00"),
        ])

        # ── Education / certification ──
        await entry(client, "2025-09-01",
            "AWS Cloud Practitioner exam fee + Udemy course", [
            ("5080",  1, "35000.00"),
            ("1001", -1, "35000.00"),
        ])
        await entry(client, "2025-12-05",
            "Professional development – Coursera annual subscription", [
            ("5080",  1, "28500.00"),
            ("1001", -1, "28500.00"),
        ])

        # ── Travel ──
        await entry(client, "2025-07-08",
            "Thailand trip – SriLankan Airlines + Pathumwan Princess Hotel (4n)", [
            ("5130",  1, "185000.00"),
            ("1001", -1, "185000.00"),
        ])
        await entry(client, "2026-01-12",
            "Kandy long weekend – Araliya Resort & Spa (2 nights)", [
            ("5130",  1, "48500.00"),
            ("1001", -1, "48500.00"),
        ])

        # ── Clothing (bi-annual) ──
        await entry(client, "2025-05-15",
            "Odel + H&M – mid-year wardrobe refresh", [
            ("5110",  1, "38500.00"),
            ("1001", -1, "38500.00"),
        ])
        await entry(client, "2025-12-26",
            "Odel Boxing Day sale + online purchases – festive shopping", [
            ("5110",  1, "52000.00"),
            ("1001", -1, "52000.00"),
        ])

        # ── Annual bank fee ──
        await entry(client, "2025-04-15",
            "People's Bank – Annual account maintenance & debit card fee", [
            ("5170",  1, "1500.00"),
            ("1001", -1, "1500.00"),
        ])

        # ── Credit card snapshot (April – carry-forward from March charges) ──
        await entry(client, "2025-04-18",
            "Visa Infinite – March statement: Restaurants & online (carry-fwd)", [
            ("5050",  1, "18500.00"),
            ("5040",  1, "12000.00"),
            ("2030", -1, "30500.00"),   # CR Credit card liability
        ])
        await entry(client, "2025-04-25",
            "Visa Infinite – Full settlement of April statement", [
            ("2030",  1, "30500.00"),   # DR Credit card (reduce liability)
            ("1001", -1, "30500.00"),
        ])

        # ── Quarterly IRD income tax installments ──
        for date, q in [
            ("2025-08-15", "Q1"),
            ("2025-11-15", "Q2"),
            ("2026-02-15", "Q3"),
        ]:
            await entry(client, date,
                f"IRD – Income Tax Installment {q} AY 2025/26", [
                ("5140",  1, "200000.00"),
                ("1001", -1, "200000.00"),
            ])

        # ── Quarterly business expenses ──
        for date, q in [
            ("2025-05-31", "Q1"),
            ("2025-08-31", "Q2"),
            ("2025-11-30", "Q3"),
            ("2026-02-28", "Q4"),
        ]:
            await entry(client, date,
                f"Business expenses – stationery, subscriptions & tools ({q})", [
                ("5160",  1, "28500.00"),
                ("1001", -1, "28500.00"),
            ])

        # ── Local freelance income (LKR) ──
        await entry(client, "2025-08-15",
            "Freelance – Website redesign & SEO (Colombo Retail Pvt Ltd)", [
            ("1001",  1, "150000.00"),
            ("4030", -1, "150000.00"),
        ])
        await entry(client, "2025-11-20",
            "Freelance – Brand identity & motion graphics (PaperTree Startup)", [
            ("1001",  1, "200000.00"),
            ("4030", -1, "200000.00"),
        ])

        # ── Fixed Deposit interest (quarterly, AIT 5% withheld) ──
        # FD principal LKR 5,000,000 @ 7% p.a. = LKR 87,500 per quarter
        for date, q in [
            ("2025-06-30", "Q1"),
            ("2025-09-30", "Q2"),
            ("2025-12-31", "Q3"),
            ("2026-03-31", "Q4"),
        ]:
            # 87500 gross; AIT = 87500 * 5% = 4375; net = 83125
            await entry(client, date,
                f"People's Bank FD Interest – {q} FY2025/26 (AIT 5% withheld)", [
                ("1001",  1, "83125.00"),
                ("2010",  1,  "4375.00"),   # DR AIT Withheld liability (pre-paid tax)
                ("4010", -1, "87500.00"),   # CR Interest Income
            ])

        # ── Foreign Service Income (USD consulting → HSBC USD → LKR) ──
        # Two-leg per remittance:
        #   Leg 1: Receive USD into HSBC (DR USD acct, CR FSI)
        #   Leg 2: Convert USD→LKR at bank (DR LKR acct + FX fee, CR USD acct)
        # 0.2% FX conversion fee

        fsi = [
            ("2025-05-15", "TechCorp Pte (Singapore) – May 2025 consulting",  2000, "302",  604000),
            ("2025-06-18", "TechCorp Pte (Singapore) – June 2025 consulting", 2000, "305",  610000),
            ("2025-08-12", "TechCorp Pte (Singapore) – Aug 2025 consulting",  1500, "310",  465000),
            ("2025-10-20", "TechCorp Pte (Singapore) – Oct 2025 consulting",  2000, "315",  630000),
            ("2025-12-15", "TechCorp Pte (Singapore) – Dec 2025 consulting",  2500, "320",  800000),
            ("2026-02-10", "TechCorp Pte (Singapore) – Feb 2026 consulting",  1800, "318",  572400),
        ]
        for date, desc, usd, rate, lkr in fsi:
            fee = round(Decimal(lkr) * Decimal("0.002"), 2)
            net = Decimal(lkr) - fee

            # Leg 1: USD consulting receipt → recognise FSI at spot rate
            await entry(client, date, f"{desc} (USD receipt)",
                [
                    ("1003",  1, str(usd),  "USD", rate),  # DR HSBC USD account
                    ("4020", -1, str(lkr), "LKR", "1"),    # CR Foreign Service Income
                ],
            )
            # Leg 2: HSBC USD → People's Bank LKR (telegraphic transfer)
            await entry(client, date, f"{desc} – USD→LKR TT @ {rate} (0.2% FX fee)",
                [
                    ("1001",  1, str(net),  "LKR", "1"),          # DR LKR bank (net)
                    ("5170",  1, str(fee),  "LKR", "1"),          # DR FX fee
                    ("1003", -1, str(usd),  "USD", rate),         # CR HSBC USD
                ],
            )

        # ── Monthly recurring (loop over all 12 months) ──────────────────────
        for i, ym in enumerate(months):
            # ── Salary (gross 375k, APIT 25k withheld, net 350k) ──
            await entry(client, f"{ym}-26",
                f"Salary – {ym} (ABC Technology Ltd, APIT deducted)", [
                ("1001",  1, "350000.00"),
                ("2000",  1,  "25000.00"),   # DR APIT Payable (withheld tax)
                ("4000", -1, "375000.00"),   # CR Employment Income
            ])

            # ── Rent (paid 5th each month) ──
            await entry(client, f"{ym}-05",
                f"Rent – {ym} (Colombo 5 apartment)", [
                ("5000",  1, "75000.00"),
                ("1001", -1, "75000.00"),
            ])

            # ── Electricity ──
            await entry(client, f"{ym}-12",
                f"CEB electricity – {ym}", [
                ("5010",  1, str(elec[i])),
                ("1001", -1, str(elec[i])),
            ])

            # ── Water ──
            await entry(client, f"{ym}-14",
                f"NWSDB water & sewerage – {ym}", [
                ("5020",  1, "2400.00"),
                ("1001", -1, "2400.00"),
            ])

            # ── Internet & mobile ──
            await entry(client, f"{ym}-08",
                f"Dialog broadband + mobile plan – {ym}", [
                ("5030",  1, "4990.00"),
                ("1001", -1, "4990.00"),
            ])

            # ── Groceries ──
            await entry(client, f"{ym}-20",
                f"Keells Super & Cargills – groceries {ym}", [
                ("5040",  1, str(groc[i])),
                ("1001", -1, str(groc[i])),
            ])

            # ── Dining & entertainment ──
            await entry(client, f"{ym}-22",
                f"Dining, coffee & entertainment – {ym}", [
                ("5050",  1, str(dining[i])),
                ("1001", -1, str(dining[i])),
            ])

            # ── Transport ──
            await entry(client, f"{ym}-25",
                f"Fuel (IOC), PickMe & parking – {ym}", [
                ("5060",  1, str(transp[i])),
                ("1001", -1, str(transp[i])),
            ])

            # ── Health insurance premium (monthly) ──
            await entry(client, f"{ym}-03",
                f"Ceylinco health insurance premium – {ym}", [
                ("5091",  1, "8500.00"),
                ("1001", -1, "8500.00"),
            ])

            # ── Subscriptions ──
            await entry(client, f"{ym}-07",
                f"Netflix (3000) + Spotify (1200) + Microsoft 365 (0) – {ym}", [
                ("5100",  1, "4200.00"),
                ("1001", -1, "4200.00"),
            ])

            # ── Savings account interest ──
            await entry(client, f"{ym}-28",
                f"People's Bank savings interest – {ym}", [
                ("1001",  1, str(sav_i[i])),
                ("4015", -1, str(sav_i[i])),
            ])

            # ── Rental income (from Apartment 3B) ──
            await entry(client, f"{ym}-05",
                f"Rental income – Apartment 3B, Nugegoda ({ym})", [
                ("1000",  1, "45000.00"),
                ("4040", -1, "45000.00"),
            ])

            # ── Healthcare (irregular months only) ──
            if health[i] > 0:
                await entry(client, f"{ym}-18",
                    f"Healthcare – doctor, pharmacy, lab tests {ym}", [
                    ("5070",  1, str(health[i])),
                    ("1001", -1, str(health[i])),
                ])

        print(f"✓  {_entry_count} entries\n")

        # ── 3. Reminders ──────────────────────────────────────────────────────
        print("── Creating reminders ────────────────────────────────────────")

        reminders_data = [
            # IRD filing deadlines                                  ← ≤50 chars
            ("IRD – Q4 Installment AY 2025/26",          "2026-05-15"),
            ("IRD – Annual Return filing AY 2025/26",    "2026-09-30"),
            ("IRD – Q1 Installment AY 2026/27",          "2026-08-15"),
            # Document collection
            ("Collect T10 from ABC Technology",          "2026-04-30"),
            ("Collect AIT certificates – People's Bank", "2026-04-30"),
            ("HSBC – FX statement for FSI (annual)",     "2026-05-01"),
            ("TechCorp – consulting income cert 2025/26","2026-05-15"),
            # Financial
            ("AIA Life Insurance premium renewal",       "2026-06-01"),
            ("People's Bank FD maturity – reinvest 5M", "2026-08-01"),
            ("Apartment 3B lease renewal",               "2026-03-31"),
        ]

        rids = []
        for kind, due in reminders_data:
            rid = await remind(client, kind, due)
            rids.append(rid)

        print(f"✓  {len(rids)} reminders\n")

        # ── 4. Debts ──────────────────────────────────────────────────────────
        print("── Creating debts ────────────────────────────────────────────")
        await mkdebt(client, "Housing Loan (HNB)",         3_800_000, 0.115, 52_000)
        await mkdebt(client, "Vehicle Lease (Commercial)",   420_000, 0.14,  38_000)
        print("✓  2 debts\n")

        # ── 5. Portfolio holdings ─────────────────────────────────────────────
        print("── Creating portfolio holdings ───────────────────────────────")
        await mkholding(client, "COMB.N", "Commercial Bank",      "equity",       250_000, 312_000)
        await mkholding(client, "JKH.N",  "John Keells Holdings", "equity",       180_000, 205_000)
        await mkholding(client, "TBILL",  "Treasury Bill 1yr",    "fixed_income", 300_000, 324_000)
        await mkholding(client, "USDT",   "USDT Stablecoin",      "crypto",        50_000,  51_500)
        print("✓  4 holdings\n")

        # ── 6. Current-month budget + spending ────────────────────────────────
        # Uses the live current month so the Budget/Dashboard "this month" views
        # always have data, regardless of when the seed is run.
        print("── Creating current-month budget + spending ──────────────────")
        today = date_cls.today()
        m_start = today.replace(day=1)
        m_end = today.replace(day=calendar.monthrange(today.year, today.month)[1])
        ms, me = m_start.isoformat(), m_end.isoformat()
        # Current-month salary so income-vs-expense / "saved this month" are realistic.
        await entry(client, m_start.replace(day=1).isoformat(), "Salary — current month", [("1001",  1, "120000.00"), ("4000", -1, "120000.00")])
        # Partial-month expenses landing around ~57% of the total limit.
        await entry(client, ms,                     "Monthly rent",           [("5000",  1, "45000.00"), ("1001", -1, "45000.00")])
        await entry(client, m_start.replace(day=5).isoformat(),  "Keells groceries",  [("5040",  1, "12500.00"), ("1001", -1, "12500.00")])
        await entry(client, m_start.replace(day=12).isoformat(), "Cargills groceries", [("5040",  1, "15500.00"), ("1001", -1, "15500.00")])
        await entry(client, m_start.replace(day=8).isoformat(),  "Dinner out",        [("5050",  1, "6500.00"),  ("1001", -1, "6500.00")])
        await entry(client, m_start.replace(day=15).isoformat(), "Cafe & takeout",    [("5050",  1, "3000.00"),  ("1001", -1, "3000.00")])
        await entry(client, m_start.replace(day=3).isoformat(),  "Fuel",              [("5060",  1, "4200.00"),  ("1001", -1, "4200.00")])
        await entry(client, m_start.replace(day=14).isoformat(), "PickMe rides",      [("5060",  1, "2000.00"),  ("1001", -1, "2000.00")])
        await mkbudget(client, ms, me, [
            ("5000", 75_000),  # Rent
            ("5040", 45_000),  # Groceries & Supermarket
            ("5050", 20_000),  # Dining & Entertainment
            ("5060", 15_000),  # Transport & Fuel
        ])
        print("✓  budget + 7 current-month entries\n")

        # ── 7. Compute tax ────────────────────────────────────────────────────
        print("── Computing tax AY 2025/26 ──────────────────────────────────")
        r = await client.post("/tax/compute", params={"year": "2025/26"})
        if r.is_success:
            t = r.json()
            print(f"  Gross income         : LKR {Decimal(t['gross_income']):>15,.2f}")
            print(f"  Foreign service inc  : LKR {Decimal(t.get('foreign_service_income','0') if 'foreign_service_income' in t else '0'):>15,.2f}")
            print(f"  Personal relief      : LKR {Decimal(t['personal_relief_applied']):>15,.2f}")
            print(f"  Taxable income       : LKR {Decimal(t['taxable_income']):>15,.2f}")
            print(f"  Tax before credits   : LKR {Decimal(t['tax_before_credits']):>15,.2f}")
            print(f"  APIT credit          : LKR {Decimal(t['apit_credit']):>15,.2f}")
            print(f"  AIT credit           : LKR {Decimal(t['ait_credit']):>15,.2f}")
            print(f"  Tax payable          : LKR {Decimal(t['tax_payable']):>15,.2f}")
        else:
            print(f"  ✗ Tax compute failed: {r.text[:200]}", file=sys.stderr)

        print("\n✅  Seed complete!")


async def main() -> None:
    if SEED_TOKEN:
        token, user_id = SEED_TOKEN, SEED_TOKEN
        print(f"🔑  Seeding in dev mode (user_id={user_id})\n")
    else:
        token, user_id = get_auth()
        print(f"🔑  Seeding as {SEED_EMAIL} (user_id={user_id})\n")
    if SEED_SKIP_CLEAR:
        print("⏭  Skipping direct-Postgres cleanup (SEED_SKIP_CLEAR=1)\n")
    else:
        # Purge the legacy dev-user data AND any prior data for the seeding account
        await clear_user_data([LEGACY_USER, user_id])
    await seed(token)
    if not SEED_SKIP_CLEAR:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
