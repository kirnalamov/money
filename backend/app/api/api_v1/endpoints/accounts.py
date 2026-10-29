from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, delete
from app.models.transaction import Transaction
from app.models.account import Account as AccountModel
from app.models.user_item import UserItem
from app.schemas.account import Account, AccountCreate, AccountUpdate
from app.crud.crud_account import account as crud_account
from app.api.api_v1.endpoints import auth
from app.db.session import get_db
from app.models.user import User
from app.core.deps import get_current_active_user

router = APIRouter()

@router.get("/", response_model=List[Account])
async def read_accounts(
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Retrieve accounts for current user.
    """
    return await crud_account.get_multi_by_owner(
        db=db, user_id=current_user.id, skip=skip, limit=limit  # type: ignore
    )

@router.post("/", response_model=Account)
async def create_account(
    *,
    db: AsyncSession = Depends(get_db),
    item_in: AccountCreate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Create new account.
    """
    return await crud_account.create_with_owner(
        db=db, obj_in=item_in, user_id=current_user.id  # type: ignore
    )

@router.put("/{id}", response_model=Account)
async def update_account(
    *,
    db: AsyncSession = Depends(get_db),
    id: int,
    item_in: AccountUpdate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Update an account.
    """
    account = (await db.execute(select(AccountModel).where(AccountModel.id == id).with_for_update())).scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    if account.user_id != current_user.id:
        raise HTTPException(status_code=400, detail="Not enough permissions")
    if item_in.balance is not None:
        if item_in.expected_balance is None or item_in.expected_balance != float(account.balance):
            raise HTTPException(status_code=409, detail="Account balance has changed; reload before editing")
    if item_in.currency is not None and item_in.currency != account.currency:
        if (await db.execute(select(Transaction.id).where(or_(Transaction.account_id == id, Transaction.to_account_id == id)).limit(1))).first():
            raise HTTPException(status_code=409, detail="Cannot change currency of an account with transactions")
    return await crud_account.update(db=db, db_obj=account, obj_in=item_in.model_dump(exclude_unset=True, exclude={"expected_balance"}))

@router.get("/{id}", response_model=Account)
async def read_account(
    *,
    db: AsyncSession = Depends(get_db),
    id: int,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Get account by ID.
    """
    account = await crud_account.get(db=db, id=id)
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    if account.user_id != current_user.id:
        raise HTTPException(status_code=400, detail="Not enough permissions")
    return account

@router.delete("/{id}", response_model=Account)
async def delete_account(
    *,
    db: AsyncSession = Depends(get_db),
    id: int,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Delete an account.
    """
    account = (await db.execute(select(AccountModel).where(AccountModel.id == id).with_for_update())).scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    if account.user_id != current_user.id:
        raise HTTPException(status_code=400, detail="Not enough permissions")
    if (await db.execute(select(Transaction.id).where(or_(Transaction.account_id == id, Transaction.to_account_id == id)).limit(1))).first():
        raise HTTPException(status_code=409, detail="Cannot delete an account with transactions")
    await db.execute(delete(UserItem).where(UserItem.user_id == current_user.id, UserItem.kind == "positions", UserItem.key.like(f"{id}:%")))
    return await crud_account.remove(db=db, id=id)
