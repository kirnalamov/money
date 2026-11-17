from datetime import datetime, timedelta, timezone
import hashlib

from fastapi import HTTPException, Request, status
from sqlalchemy import text

from app.db.session import AsyncSessionLocal


def get_rate_limiter(requests_per_minute: int = 60):
    async def rate_limiter(request: Request):
        identity = request.client.host if request.client else 'unknown'
        if request.url.path.endswith('/login'):
            form = await request.form()
            identity += ':' + hashlib.sha256(str(form.get('username', '')).encode()).hexdigest()
        key = f"{request.url.path}:{identity}"
        async with AsyncSessionLocal() as db:
            if db.bind.dialect.name == "sqlite":
                await db.execute(text("BEGIN IMMEDIATE"))
            else:
                await db.execute(text("SELECT pg_advisory_xact_lock(hashtextextended(:key, 0))"), {"key": key})
                # Only one worker cleans expired attempts; others keep serving logins.
                cleanup = (await db.execute(text("SELECT pg_try_advisory_xact_lock(173904521)"))).scalar_one()
            cutoff = datetime.now(timezone.utc) - timedelta(minutes=1)
            if db.bind.dialect.name == "sqlite" or cleanup:
                await db.execute(text("DELETE FROM auth_attempts WHERE created_at < :cutoff"), {"cutoff": cutoff})
            count = (await db.execute(text("SELECT count(*) FROM auth_attempts WHERE client_key = :key AND created_at >= :cutoff"), {"key": key, "cutoff": cutoff})).scalar_one()
            if count >= requests_per_minute:
                await db.commit()
                raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Too many requests. Please try again later.")
            await db.execute(text("INSERT INTO auth_attempts (client_key) VALUES (:key)"), {"key": key})
            await db.commit()
    return rate_limiter
