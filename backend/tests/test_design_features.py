import os
import asyncio

os.environ.setdefault("SECRET_KEY", "test-secret-key-with-at-least-32-characters")
os.environ.setdefault("POSTGRES_SERVER", "localhost")
os.environ.setdefault("POSTGRES_USER", "test")
os.environ.setdefault("POSTGRES_PASSWORD", "test")
os.environ.setdefault("POSTGRES_DB", "test")
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///:memory:")

from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.db.base import Base
from app.db.session import get_db
from app.main import app


def test_recurring_flag_and_preferences():
    asyncio.run(check_features())


async def check_features():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    sessions = async_sessionmaker(engine, expire_on_commit=False)

    async def db_override():
        async with sessions() as session:
            yield session

    async def allow():
        return None

    app.dependency_overrides[get_db] = db_override
    for route in app.routes:
        if hasattr(route, "dependant"):
            for dependency in route.dependant.dependencies:
                if getattr(dependency.call, "__name__", "") == "rate_limiter":
                    app.dependency_overrides[dependency.call] = allow
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post("/api/v1/auth/register", json={"username": "carol", "email": "carol@example.com", "password": "Password123"})
            assert response.status_code == 201, response.text
            login = await client.post("/api/v1/auth/login", data={"username": "carol", "password": "Password123"})
            headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
            account = (await client.get("/api/v1/accounts/", headers=headers)).json()[0]

            # флаг «регулярная/обязательная» сохраняется и возвращается
            created = await client.post("/api/v1/transactions/", headers=headers, json={"accountId": account["id"], "type": "expense", "amount": 10, "category": "Housing", "isRecurring": True})
            assert created.status_code == 200, created.text
            assert created.json()["isRecurring"] is True
            plain = await client.post("/api/v1/transactions/", headers=headers, json={"accountId": account["id"], "type": "expense", "amount": 5, "category": "Food"})
            assert plain.json()["isRecurring"] is False
            listing = (await client.get("/api/v1/transactions/", headers=headers)).json()
            assert {item["category"]: item["isRecurring"] for item in listing} == {"Housing": True, "Food": False}
            updated = await client.put(f"/api/v1/transactions/{plain.json()['id']}", headers=headers, json={"isRecurring": True})
            assert updated.json()["isRecurring"] is True

            # настройки интерфейса
            assert (await client.get("/api/v1/user-items/preferences", headers=headers)).json() == {}
            prefs = {"plutus-tax-settings": {"tax": 15, "commission": 0.1}, "plutus-category-kinds": {"food": "out"}}
            saved = await client.put("/api/v1/user-items/preferences", headers=headers, json=prefs)
            assert saved.status_code == 200, saved.text
            assert (await client.get("/api/v1/user-items/preferences", headers=headers)).json() == prefs
            assert (await client.put("/api/v1/user-items/preferences", headers=headers, json={"evil": {}})).status_code == 422
            assert (await client.put("/api/v1/user-items/preferences", headers=headers, json={"plutus-tax-settings": "x"})).status_code == 422
            items = (await client.get("/api/v1/user-items/", headers=headers)).json()
            assert set(items) == {"limits", "positions", "recurringExpenses"}
    finally:
        app.dependency_overrides.clear()
        await engine.dispose()


def test_security_search_ranking_and_merge(monkeypatch):
    from app.services import security_search as ss

    async def fake_moex(client, q):
        return [
            {"symbol": "SBERP", "name": "Сбербанк-п", "hint": "moex", "asset_class": "stock", "exchange": "МосБиржа"},
            {"symbol": "SBER", "name": "Сбербанк", "hint": "moex", "asset_class": "stock", "exchange": "МосБиржа"},
        ]

    async def fake_yahoo(client, q):
        return [{"symbol": "SBRCY", "name": "Sberbank ADR", "hint": "global", "asset_class": "stock", "exchange": "OTC"}]

    async def fake_crypto(client, q):
        return []

    monkeypatch.setattr(ss, "_search_moex", fake_moex)
    monkeypatch.setattr(ss, "_search_yahoo", fake_yahoo)
    monkeypatch.setattr(ss, "_search_crypto", fake_crypto)
    ss._CACHE.clear()
    result = asyncio.run(ss.search_securities("sber"))
    assert [item["symbol"] for item in result] == ["SBER", "SBERP", "SBRCY"]
    assert asyncio.run(ss.search_securities("  ")) == []
