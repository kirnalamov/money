import asyncio
from unittest.mock import AsyncMock


def test_database_dependency_closes_session_after_endpoint_error(monkeypatch):
    from app.db import session

    db = AsyncMock()
    context = AsyncMock()
    context.__aenter__.return_value = db
    monkeypatch.setattr(session, "AsyncSessionLocal", lambda: context)

    async def check():
        dependency = session.get_db()
        assert await anext(dependency) is db
        try:
            await dependency.athrow(ValueError("invalid refresh token"))
        except ValueError:
            pass
        db.close.assert_awaited_once()

    asyncio.run(check())
