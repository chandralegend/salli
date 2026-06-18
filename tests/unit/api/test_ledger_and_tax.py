from decimal import Decimal
from unittest.mock import MagicMock

import pytest

from tests.unit.api.conftest import AUTH


@pytest.mark.asyncio
async def test_trial_balance(client, mock_services):
    mock_services.ledger.get_trial_balance.return_value = {
        "acc-1": Decimal("500000"),
        "acc-2": Decimal("-500000"),
    }
    r = await client.get("/ledger/trial-balance", headers=AUTH)
    assert r.status_code == 200
    body = r.json()
    assert body["net"] == "0"
    assert body["balances"]["acc-1"] == "500000"


@pytest.mark.asyncio
async def test_income_statement(client, mock_services):
    mock_services.ledger.get_income_statement.return_value = Decimal("120000")
    r = await client.get(
        "/ledger/income-statement",
        params={"from_date": "2025-04-01", "to_date": "2026-03-31"},
        headers=AUTH,
    )
    assert r.status_code == 200
    assert r.json()["net_income"] == "120000"


@pytest.mark.asyncio
async def test_list_tax_packs(client, mock_services):
    pack = MagicMock()
    pack.country = "LK"
    pack.year = "2025/26"
    pack.version = "1.0.0"
    pack.period_start = "2025-04-01"
    pack.period_end = "2026-03-31"
    pack.personal_relief = Decimal("1800000")
    pack.filing.return_due = "2026-11-30"
    mock_services.tax.list_packs.return_value = [pack]

    r = await client.get("/tax/packs", headers=AUTH)
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 1
    assert data[0]["year"] == "2025/26"
    assert data[0]["personal_relief"] == "1800000"


@pytest.mark.asyncio
async def test_compute_tax(client, mock_services):
    result = MagicMock()
    result.pack_year = "2025/26"
    result.pack_version = "1.0.0"
    result.gross_income = Decimal("3000000")
    result.personal_relief_applied = Decimal("1800000")
    result.taxable_income = Decimal("1200000")
    result.tax_before_credits = Decimal("114000")
    result.apit_credit = Decimal("0")
    result.ait_credit = Decimal("0")
    result.foreign_tax_credit = Decimal("0")
    result.total_credits = Decimal("0")
    result.tax_payable = Decimal("114000")
    result.band_workings = []
    mock_services.tax.compute_tax.return_value = result

    r = await client.post("/tax/compute", headers=AUTH)
    assert r.status_code == 200
    body = r.json()
    assert body["tax_payable"] == "114000"
    assert body["pack_year"] == "2025/26"


@pytest.mark.asyncio
async def test_latest_tax_none(client, mock_services):
    mock_services.tax.get_latest_computation.return_value = None
    r = await client.get("/tax/latest", headers=AUTH)
    assert r.status_code == 200
    assert r.json() == {"result": None}


@pytest.mark.asyncio
async def test_health(client):
    r = await client.get("/healthz")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"
