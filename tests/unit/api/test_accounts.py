import pytest

from tests.unit.api.conftest import AUTH, make_account


@pytest.mark.asyncio
async def test_list_accounts_empty(client, mock_services):
    mock_services.ledger.list_accounts.return_value = []
    r = await client.get("/accounts/", headers=AUTH)
    assert r.status_code == 200
    assert r.json() == []


@pytest.mark.asyncio
async def test_list_accounts(client, mock_services):
    mock_services.ledger.list_accounts.return_value = [make_account()]
    r = await client.get("/accounts/", headers=AUTH)
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 1
    assert data[0]["code"] == "1000"
    assert data[0]["type"] == "asset"


@pytest.mark.asyncio
async def test_add_account(client, mock_services):
    mock_services.ledger.add_account.return_value = "new-acc-id"
    r = await client.post(
        "/accounts/",
        json={"code": "2000", "name": "Liabilities", "type": "liability"},
        headers=AUTH,
    )
    assert r.status_code == 201
    assert r.json() == {"id": "new-acc-id"}
    mock_services.ledger.add_account.assert_awaited_once()


@pytest.mark.asyncio
async def test_missing_auth_returns_4xx(client):
    r = await client.get("/accounts/")
    assert r.status_code in (401, 403)
