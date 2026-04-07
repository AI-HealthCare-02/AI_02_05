import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_check(client: AsyncClient):
    res = await client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_schedule_requires_auth(client: AsyncClient):
    res = await client.get("/schedule/", params={"date": "2025-01-01"})
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_ocr_status_not_found(client: AsyncClient):
    res = await client.get("/ocr/00000000-0000-0000-0000-000000000001/status")
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_share_view_not_found(client: AsyncClient):
    res = await client.get("/share/invalid-token/view")
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_admin_stats(client: AsyncClient):
    res = await client.get("/admin/stats")
    assert res.status_code == 200
    data = res.json()
    assert "users" in data
    assert "prescriptions" in data
    assert "checks" in data
    assert "active_schedules" in data
    assert "daily_checks" in data


@pytest.mark.asyncio
async def test_drug_search_requires_query(client: AsyncClient):
    res = await client.get("/drugs/search")
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_vapid_public_key(client: AsyncClient):
    res = await client.get("/push/vapid-public-key")
    assert res.status_code == 200
    assert "public_key" in res.json()
