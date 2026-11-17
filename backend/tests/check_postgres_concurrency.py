"""Run inside the backend container; uses an isolated, temporary database schema."""
import asyncio
from decimal import Decimal
from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.config import settings
from app.db.base import Base
from app.models.user import User
from app.models.account import Account
from app.models.transaction import Transaction
from app.models.user_item import UserItem
from app.api.api_v1.endpoints.user_items import Payment, pay_recurring
from app.api.api_v1.endpoints.transactions import create_transaction
from app.schemas.core import TransactionCreate


async def main():
    schema = "audit_" + uuid4().hex
    admin = create_async_engine(str(settings.DATABASE_URL))
    async with admin.begin() as connection:
        await connection.execute(text(f'CREATE SCHEMA "{schema}"'))
    engine = create_async_engine(str(settings.DATABASE_URL), connect_args={"server_settings": {"search_path": schema}})
    sessions = async_sessionmaker(engine, expire_on_commit=False, autoflush=False)
    try:
        async with engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)
        async with sessions() as db:
            user = User(email="audit@example.com", username="audit", hashed_password="unused", role="user")
            db.add(user)
            await db.flush()
            account = Account(name="Audit", type="cash", currency="USD", balance=100, user_id=user.id)
            db.add(account)
            await db.flush()
            db.add(UserItem(user_id=user.id, kind="recurringExpenses", key="rent", value={"id": "rent", "name": "Rent", "amount": 5, "currency": "USD", "category": "Housing", "dueDay": 1}))
            await db.commit()

        async def pay():
            async with sessions() as db:
                try:
                    await pay_recurring("rent", Payment(account_id=account.id), db, user)
                    return 200
                except HTTPException as error:
                    return error.status_code

        assert sorted(await asyncio.gather(pay(), pay())) == [200, 409]

        async def expense():
            async with sessions() as db:
                await create_transaction(db=db, item_in=TransactionCreate(accountId=account.id, amount="0.10"), current_user=user)

        await asyncio.gather(*(expense() for _ in range(10)))
        async with sessions() as db:
            balance = await db.scalar(select(Account.balance).where(Account.id == account.id))
            assert balance == Decimal("94.00"), balance
            rows = (await db.execute(select(Transaction))).scalars().all()
            assert len(rows) == 11, len(rows)
        print("PostgreSQL concurrency: duplicate payment rejected; 10 concurrent writes preserve balance")
    finally:
        await engine.dispose()
        async with admin.begin() as connection:
            await connection.execute(text(f'DROP SCHEMA "{schema}" CASCADE'))
        await admin.dispose()


if __name__ == "__main__":
    asyncio.run(main())
