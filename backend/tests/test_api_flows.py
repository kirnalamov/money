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
from sqlalchemy import text
from starlette.requests import Request
from fastapi import HTTPException

from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.middleware import rate_limit


def test_money_ownership_and_refresh():
    asyncio.run(check_money_ownership_and_refresh())


async def check_money_ownership_and_refresh():
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
            for username in ("alice", "bobby"):
                response = await client.post("/api/v1/auth/register", json={"username": username, "email": f"{username}@example.com", "password": "Password123"})
                assert response.status_code == 201, response.text
            login = await client.post("/api/v1/auth/login", data={"username": "alice", "password": "Password123"})
            assert login.status_code == 200, login.text
            tokens = login.json()
            headers = {"Authorization": f"Bearer {tokens['access_token']}"}
            account = (await client.get("/api/v1/accounts/", headers=headers)).json()[0]
            destination = (await client.post("/api/v1/accounts/", headers=headers, json={"name": "Second", "type": "cash"})).json()
            transfer = await client.post("/api/v1/transactions/", headers=headers, json={"accountId": account["id"], "toAccountId": destination["id"], "type": "transfer", "amount": 0.1})
            assert transfer.status_code == 200, transfer.text
            assert (await client.get(f"/api/v1/accounts/{destination['id']}", headers=headers)).json()["balance"] == 0.1
            assert (await client.delete(f"/api/v1/accounts/{account['id']}", headers=headers)).status_code == 409
            other = (await client.post("/api/v1/auth/login", data={"username": "bobby", "password": "Password123"})).json()
            other_headers = {"Authorization": f"Bearer {other['access_token']}"}
            limit = {"id": "rent", "category": "Housing", "period": "monthly", "amount": 100, "currency": "USD", "spent": 0}
            assert (await client.put("/api/v1/user-items/limits/rent", headers=headers, json=limit)).status_code == 200
            assert (await client.get("/api/v1/user-items/", headers=headers)).json()["limits"] == [limit]
            assert (await client.get("/api/v1/user-items/", headers=other_headers)).json()["limits"] == []
            position = {"symbol": "ABC", "name": "Stock", "quantity": 1, "avgPrice": 5, "currentPrice": 6, "currency": "USD", "accountId": account["id"]}
            assert (await client.put(f"/api/v1/user-items/positions/{account['id']}:ABC", headers=other_headers, json=position)).status_code == 403
            assert (await client.put(f"/api/v1/user-items/positions/{account['id']}:ABC", headers=headers, json=position)).status_code == 200
            assert (await client.delete("/api/v1/user-items/limits/rent", headers=other_headers)).status_code == 204
            assert len((await client.get("/api/v1/user-items/", headers=headers)).json()["limits"]) == 1
            assert (await client.get(f"/api/v1/transactions/{transfer.json()['id']}", headers=other_headers)).status_code == 404
            assert (await client.delete(f"/api/v1/transactions/{transfer.json()['id']}", headers=headers)).status_code == 200
            assert (await client.get(f"/api/v1/accounts/{destination['id']}", headers=headers)).json()["balance"] == 0
            refresh = await client.post("/api/v1/auth/refresh", json={"refresh_token": tokens["refresh_token"]})
            assert refresh.status_code == 200, refresh.text
            assert (await client.post("/api/v1/auth/refresh", json={"refresh_token": tokens["refresh_token"]})).status_code == 401
    finally:
        app.dependency_overrides.clear()
        await engine.dispose()


def test_rate_limit_is_shared():
    async def check():
        engine = create_async_engine("sqlite+aiosqlite:///:memory:")
        async with engine.begin() as connection:
            await connection.execute(text("CREATE TABLE auth_attempts (client_key TEXT NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)"))
        old = rate_limit.AsyncSessionLocal
        rate_limit.AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)
        try:
            request = Request({"type": "http", "method": "POST", "path": "/login", "scheme": "http", "headers": [], "server": ("test", 80), "client": ("127.0.0.1", 1)})
            await rate_limit.get_rate_limiter(1)(request)
            try:
                await rate_limit.get_rate_limiter(1)(request)
                assert False, "second attempt should be blocked"
            except HTTPException as exc:
                assert exc.status_code == 429
        finally:
            rate_limit.AsyncSessionLocal = old
            await engine.dispose()
    asyncio.run(check())
