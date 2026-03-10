from typing import List, Sequence
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.crud.base import CRUDBase
from app.models.account import Account
from app.schemas.account import AccountCreate, AccountUpdate

class CRUDAccount(CRUDBase[Account, AccountCreate, AccountUpdate]):
    async def get_multi_by_owner(
        self, db: AsyncSession, *, user_id: int, skip: int = 0, limit: int = 100
    ) -> Sequence[Account]:
        result = await db.execute(
            select(self.model)
            .filter(Account.user_id == user_id)
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()

    async def create_with_owner(
        self, db: AsyncSession, *, obj_in: AccountCreate, user_id: int
    ) -> Account:
        obj_in_data = obj_in.model_dump()
        db_obj = self.model(**obj_in_data, user_id=user_id)
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

account = CRUDAccount(Account)
