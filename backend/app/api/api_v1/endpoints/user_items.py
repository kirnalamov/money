from typing import Literal
from datetime import datetime, timezone

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
from app.models.category import Category
from app.models.transaction import Transaction
from app.schemas.core import Currency
from app.api.api_v1.endpoints.transactions import _apply_transaction_effect

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
    lastTransactionDate: str | None = None


class Payment(BaseModel):
    account_id: int


@router.get("/")
async def list_items(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_active_user)):
    rows = (await db.execute(select(UserItem).where(UserItem.user_id == user.id))).scalars().all()
    result = {"limits": [], "positions": [], "recurringExpenses": []}
    for row in rows:
        result[row.kind].append(row.value)
    return result


@router.post("/recurringExpenses/{key}/pay")
async def pay_recurring(key: str, payment: Payment, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_active_user)):
    row = (await db.execute(select(UserItem).where(UserItem.user_id == user.id, UserItem.kind == "recurringExpenses", UserItem.key == key).with_for_update())).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Recurring expense not found")
    expense = RecurringExpense.model_validate(row.value)
    now = datetime.now(timezone.utc)
    if expense.lastPaidDate or expense.lastTransactionDate:
        try:
            dates = [datetime.fromisoformat(value.replace("Z", "+00:00")) for value in (expense.lastPaidDate, expense.lastTransactionDate) if value]
            dates = [date.astimezone(timezone.utc) if date.tzinfo else date.replace(tzinfo=timezone.utc) for date in dates]
        except ValueError:
            raise HTTPException(status_code=422, detail="Invalid last payment date")
        if any((paid.year, paid.month) == (now.year, now.month) for paid in dates):
            raise HTTPException(status_code=409, detail="Recurring expense already paid this month")
    account = (await db.execute(select(Account).where(Account.id == payment.account_id, Account.user_id == user.id).with_for_update())).scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=403, detail="Not authorized to use this account")
    if account.currency != expense.currency.value:
        raise HTTPException(status_code=422, detail="Transaction currency must match the account currency")
    category = (await db.execute(select(Category).where(Category.user_id == user.id, Category.name == expense.category))).scalars().first()
    if not category:
        category = Category(name=expense.category, color="#666666", icon="help-circle", user_id=user.id)
        db.add(category)
        await db.flush()
    transaction = Transaction(amount=expense.amount, description=expense.name, date=now, type="expense", currency=expense.currency.value, account_id=account.id, category_id=category.id)
    db.add(transaction)
    _apply_transaction_effect(account, None, "expense", expense.amount)
    row.value = {**row.value, "lastPaidDate": now.isoformat(), "lastTransactionDate": now.isoformat()}
    await db.commit()
    return {"paid_at": now.isoformat()}


@router.put("/{kind}/{key}")
async def put_item(kind: Kind, key: str, value: dict, only_if_missing: bool = False, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_active_user)):
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
    if kind == "recurringExpenses":
        current = (await db.execute(select(UserItem).where(UserItem.user_id == user.id, UserItem.kind == kind, UserItem.key == key).with_for_update())).scalar_one_or_none()
        value.pop("lastTransactionDate", None)
        if current and current.value.get("lastTransactionDate"):
            value["lastTransactionDate"] = current.value["lastTransactionDate"]
    statement = insert(UserItem).values(user_id=user.id, kind=kind, key=key, value=value)
    if only_if_missing:
        result = await db.execute(statement.on_conflict_do_nothing(index_elements=["user_id", "kind", "key"]))
        await db.commit()
        if not result.rowcount:
            raise HTTPException(status_code=409, detail="Item already exists")
        return item
    await db.execute(statement.on_conflict_do_update(index_elements=["user_id", "kind", "key"], set_={"value": value}))
    await db.commit()
    return item


@router.delete("/{kind}/{key}", status_code=204)
async def delete_item(kind: Kind, key: str, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_active_user)):
    row = await db.get(UserItem, (user.id, kind, key))
    if row:
        await db.delete(row)
        await db.commit()
