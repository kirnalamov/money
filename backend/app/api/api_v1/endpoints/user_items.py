from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_active_user
from app.db.session import get_db
from app.models.user import User
from app.models.user_item import UserItem
from app.models.account import Account
from app.schemas.core import Currency

router = APIRouter()
Kind = Literal["limits", "positions", "recurringExpenses"]


class Limit(BaseModel):
    id: str = Field(min_length=1, max_length=200)
    category: str = Field(min_length=1, max_length=200)
    period: Literal["daily", "weekly", "monthly"]
    amount: float = Field(gt=0, allow_inf_nan=False)
    currency: Currency
    spent: float = Field(ge=0, allow_inf_nan=False)


class Position(BaseModel):
    symbol: str = Field(min_length=1, max_length=100)
    name: str = Field(min_length=1, max_length=200)
    quantity: float = Field(ge=0, allow_inf_nan=False)
    avgPrice: float = Field(ge=0, allow_inf_nan=False)
    currentPrice: float = Field(ge=0, allow_inf_nan=False)
    currency: Currency
    accountId: int
    assetClass: Literal["stock", "crypto", "etf", "bond", "cash"] | None = None


class RecurringExpense(BaseModel):
    id: str = Field(min_length=1, max_length=200)
    name: str = Field(min_length=1, max_length=200)
    amount: float = Field(gt=0, allow_inf_nan=False)
    currency: Currency
    category: str = Field(min_length=1, max_length=200)
    dueDay: int = Field(ge=1, le=31)
    lastPaidDate: str | None = None


@router.get("/")
async def list_items(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_active_user)):
    rows = (await db.execute(select(UserItem).where(UserItem.user_id == user.id))).scalars().all()
    result = {"limits": [], "positions": [], "recurringExpenses": []}
    for row in rows:
        result[row.kind].append(row.value)
    return result


@router.put("/{kind}/{key}")
async def put_item(kind: Kind, key: str, value: dict, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_active_user)):
    model = {"limits": Limit, "positions": Position, "recurringExpenses": RecurringExpense}[kind]
    try:
        item = model.model_validate(value)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid item")
    expected_key = f"{item.accountId}:{item.symbol}" if kind == "positions" else item.id
    if key != expected_key or len(key) > 200:
        raise HTTPException(status_code=422, detail="Invalid item key")
    if kind == "positions" and not (await db.execute(select(Account.id).where(Account.id == item.accountId, Account.user_id == user.id))).first():
        raise HTTPException(status_code=403, detail="Not authorized to use this account")
    insert = sqlite_insert if db.bind.dialect.name == "sqlite" else pg_insert
    value = item.model_dump(mode="json", exclude_none=True)
    statement = insert(UserItem).values(user_id=user.id, kind=kind, key=key, value=value)
    await db.execute(statement.on_conflict_do_update(index_elements=["user_id", "kind", "key"], set_={"value": value}))
    await db.commit()
    return item


@router.delete("/{kind}/{key}", status_code=204)
async def delete_item(kind: Kind, key: str, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_active_user)):
    row = await db.get(UserItem, (user.id, kind, key))
    if row:
        await db.delete(row)
        await db.commit()
