from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import get_current_active_user
from app.db.session import get_db
from app.models.account import Account
from app.models.category import Category
from app.models.tag import Tag
from app.models.transaction import Transaction as TransactionModel
from app.models.user import User
from app.schemas.core import (
    Transaction,
    TransactionCreate,
    TransactionOut,
    TransactionType,
    TransactionUpdate,
)

router = APIRouter()


async def _get_owned_transaction(
    db: AsyncSession,
    transaction_id: int,
    user_id: int,
    lock: bool = False,
) -> TransactionModel | None:
    query = (
        select(TransactionModel)
        .join(Account, TransactionModel.account_id == Account.id)
        .where(
            TransactionModel.id == transaction_id,
            Account.user_id == user_id,
        )
        .options(
            selectinload(TransactionModel.category),
            selectinload(TransactionModel.tags),
        )
    )
    if lock:
        query = query.with_for_update(of=TransactionModel)
    result = await db.execute(query)
    return result.scalars().first()


async def _get_owned_accounts(
    db: AsyncSession,
    account_ids: set[int],
    user_id: int,
) -> dict[int, Account]:
    result = await db.execute(
        select(Account).where(
            Account.id.in_(account_ids),
            Account.user_id == user_id,
        ).order_by(Account.id).with_for_update()
    )
    accounts = {account.id: account for account in result.scalars().all()}
    if len(accounts) != len(account_ids):
        raise HTTPException(status_code=403, detail="Not authorized to use this account")
    return accounts


async def _get_owned_category(
    db: AsyncSession,
    category_id: int,
    user_id: int,
) -> Category:
    result = await db.execute(
        select(Category).where(
            Category.id == category_id,
            Category.user_id == user_id,
        )
    )
    category = result.scalars().first()
    if not category:
        raise HTTPException(status_code=403, detail="Not authorized to use this category")
    return category


async def _resolve_tags(
    db: AsyncSession,
    tag_names: list[str],
    user_id: int,
) -> list[Tag]:
    tag_instances: list[Tag] = []
    seen_names: set[str] = set()

    for raw_name in tag_names:
        tag_name = raw_name.strip()
        if not tag_name or tag_name in seen_names:
            continue
        seen_names.add(tag_name)

        result = await db.execute(
            select(Tag).where(
                Tag.name == tag_name,
                Tag.user_id == user_id,
            )
        )
        tag = result.scalars().first()
        if not tag:
            tag = Tag(name=tag_name, user_id=user_id)
            db.add(tag)
            await db.flush()
        tag_instances.append(tag)

    return tag_instances


def _type_value(transaction_type: TransactionType | str) -> str:
    return transaction_type.value if isinstance(transaction_type, TransactionType) else str(transaction_type)


def _apply_transaction_effect(
    source: Account,
    destination: Account | None,
    transaction_type: TransactionType | str,
    amount: float,
    reverse: bool = False,
) -> None:
    type_value = _type_value(transaction_type)
    source_sign = 1 if type_value == TransactionType.INCOME.value else -1
    if reverse:
        source_sign *= -1

    amount = Decimal(str(amount))
    source.balance = Decimal(str(source.balance or 0)) + source_sign * amount
    if type_value == TransactionType.TRANSFER.value and destination is not None:
        destination.balance = Decimal(str(destination.balance or 0)) - source_sign * amount


def _validate_transaction_accounts(
    source: Account,
    destination: Account | None,
    transaction_type: TransactionType | str,
) -> None:
    type_value = _type_value(transaction_type)
    if type_value == TransactionType.TRANSFER.value:
        if destination is None:
            raise HTTPException(status_code=422, detail="Transfer destination is required")
        if source.id == destination.id:
            raise HTTPException(status_code=422, detail="Transfer accounts must be different")
        if source.currency != destination.currency:
            raise HTTPException(
                status_code=422,
                detail="Transfers between accounts with different currencies are not supported",
            )
    elif destination is not None:
        raise HTTPException(status_code=422, detail="Only transfers can have a destination account")


@router.get("/", response_model=List[TransactionOut])
async def read_transactions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    result = await db.execute(
        select(TransactionModel)
        .join(Account, TransactionModel.account_id == Account.id)
        .where(Account.user_id == current_user.id)
        .options(
            selectinload(TransactionModel.category),
            selectinload(TransactionModel.tags),
        )
        .order_by(TransactionModel.date.desc(), TransactionModel.id.desc())
        .offset(skip)
        .limit(limit)
    )
    return result.scalars().all()


@router.post("/", response_model=Transaction, response_model_by_alias=True)
async def create_transaction(
    *,
    db: AsyncSession = Depends(get_db),
    item_in: TransactionCreate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    try:
        account_ids = {item_in.account_id}
        if item_in.to_account_id is not None:
            account_ids.add(item_in.to_account_id)
        accounts = await _get_owned_accounts(db, account_ids, current_user.id)
        source = accounts[item_in.account_id]
        destination = accounts.get(item_in.to_account_id) if item_in.to_account_id is not None else None
        _validate_transaction_accounts(source, destination, item_in.type)

        currency = item_in.currency.value if item_in.currency else source.currency
        if currency != source.currency:
            raise HTTPException(status_code=422, detail="Transaction currency must match the account currency")

        category_id = item_in.category_id
        if item_in.category_name:
            result = await db.execute(
                select(Category).where(
                    Category.name == item_in.category_name,
                    Category.user_id == current_user.id,
                )
            )
            category = result.scalars().first()
            if not category:
                category = Category(
                    name=item_in.category_name,
                    color="#666666",
                    icon="help-circle",
                    user_id=current_user.id,
                )
                db.add(category)
                await db.flush()
            category_id = category.id
        elif category_id is not None:
            await _get_owned_category(db, category_id, current_user.id)

        tag_instances = await _resolve_tags(db, item_in.tags or [], current_user.id)
        obj_in_data = item_in.model_dump(exclude={"category_name", "tags"})
        obj_in_data["category_id"] = category_id
        obj_in_data["currency"] = currency
        obj_in_data["date"] = item_in.date or datetime.now(timezone.utc)

        db_obj = TransactionModel(**obj_in_data)
        db_obj.tags = tag_instances
        db.add(db_obj)
        _apply_transaction_effect(source, destination, item_in.type, item_in.amount)
        await db.commit()
    except Exception:
        await db.rollback()
        raise

    result = await _get_owned_transaction(db, db_obj.id, current_user.id)
    if result is None:
        raise HTTPException(status_code=500, detail="Transaction could not be loaded after creation")
    return result


@router.put("/{id}", response_model=Transaction, response_model_by_alias=True)
async def update_transaction(
    *,
    db: AsyncSession = Depends(get_db),
    id: int,
    item_in: TransactionUpdate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    item = await _get_owned_transaction(db, id, current_user.id, lock=True)
    if not item:
        raise HTTPException(status_code=404, detail="Transaction not found")

    try:
        old_source_id = item.account_id
        old_destination_id = item.to_account_id
        new_source_id = item_in.account_id if item_in.account_id is not None else old_source_id
        new_type = item_in.type if item_in.type is not None else item.type
        new_destination_id = (
            item_in.to_account_id
            if "to_account_id" in item_in.model_fields_set
            else old_destination_id
        )
        if _type_value(new_type) != TransactionType.TRANSFER.value:
            new_destination_id = None

        account_ids = {old_source_id, new_source_id}
        if old_destination_id is not None:
            account_ids.add(old_destination_id)
        if new_destination_id is not None:
            account_ids.add(new_destination_id)
        accounts = await _get_owned_accounts(db, account_ids, current_user.id)
        new_source = accounts[new_source_id]
        new_destination = accounts.get(new_destination_id) if new_destination_id is not None else None
        _validate_transaction_accounts(new_source, new_destination, new_type)

        new_amount = item_in.amount if item_in.amount is not None else item.amount
        new_currency = item_in.currency if item_in.currency is not None else item.currency
        if new_currency != new_source.currency:
            raise HTTPException(status_code=422, detail="Transaction currency must match the account currency")
        if new_destination is not None and new_currency != new_destination.currency:
            raise HTTPException(status_code=422, detail="Transfer currencies must match")

        if item_in.category_name is not None:
            if item_in.category_name:
                result = await db.execute(
                    select(Category).where(
                        Category.name == item_in.category_name,
                        Category.user_id == current_user.id,
                    )
                )
                category = result.scalars().first()
                if not category:
                    category = Category(
                        name=item_in.category_name,
                        color="#666666",
                        icon="help-circle",
                        user_id=current_user.id,
                    )
                    db.add(category)
                    await db.flush()
                item.category_id = category.id
            else:
                item.category_id = None
        elif "category_id" in item_in.model_fields_set:
            if item_in.category_id is None:
                item.category_id = None
            else:
                await _get_owned_category(db, item_in.category_id, current_user.id)
                item.category_id = item_in.category_id

        if item_in.tags is not None:
            item.tags = await _resolve_tags(db, item_in.tags, current_user.id)

        _apply_transaction_effect(
            accounts[old_source_id],
            accounts.get(old_destination_id) if old_destination_id is not None else None,
            item.type,
            item.amount,
            reverse=True,
        )
        _apply_transaction_effect(new_source, new_destination, new_type, new_amount)

        update_data = item_in.model_dump(exclude={"category_name", "tags"}, exclude_unset=True)
        update_data.pop("category_id", None)
        update_data["account_id"] = new_source_id
        update_data["to_account_id"] = new_destination_id
        update_data["type"] = new_type
        update_data["amount"] = new_amount
        update_data["currency"] = new_currency
        for key, value in update_data.items():
            setattr(item, key, value)

        await db.commit()
    except Exception:
        await db.rollback()
        raise

    result = await _get_owned_transaction(db, id, current_user.id)
    if result is None:
        raise HTTPException(status_code=500, detail="Transaction could not be loaded after update")
    return result


@router.get("/{id}", response_model=Transaction, response_model_by_alias=True)
async def read_transaction(
    *,
    db: AsyncSession = Depends(get_db),
    id: int,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    item = await _get_owned_transaction(db, id, current_user.id)
    if not item:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return item


@router.delete("/{id}", response_model=Transaction, response_model_by_alias=True)
async def delete_transaction(
    *,
    db: AsyncSession = Depends(get_db),
    id: int,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    item = await _get_owned_transaction(db, id, current_user.id, lock=True)
    if not item:
        raise HTTPException(status_code=404, detail="Transaction not found")

    try:
        account_ids = {item.account_id}
        if item.to_account_id is not None:
            account_ids.add(item.to_account_id)
        accounts = await _get_owned_accounts(db, account_ids, current_user.id)
        _apply_transaction_effect(
            accounts[item.account_id],
            accounts.get(item.to_account_id) if item.to_account_id is not None else None,
            item.type,
            item.amount,
            reverse=True,
        )
        await db.delete(item)
        await db.commit()
    except Exception:
        await db.rollback()
        raise

    return item
