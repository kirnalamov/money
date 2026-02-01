from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app import crud
from app.api import deps
from app.schemas.core import Transaction, TransactionCreate, TransactionUpdate
# Fix: Import directly because crud package might need explicit export or import
from app.crud import crud_functions as crud_transactions

from app.db.session import get_db

router = APIRouter()

@router.get("/", response_model=List[Transaction])
async def read_transactions(
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    return await crud_transactions.transaction.get_multi(db, skip=skip, limit=limit)

@router.post("/", response_model=Transaction)
async def create_transaction(
    *,
    db: AsyncSession = Depends(get_db),
    item_in: TransactionCreate,
) -> Any:
    return await crud_transactions.transaction.create(db, obj_in=item_in)

@router.put("/{id}", response_model=Transaction)
async def update_transaction(
    *,
    db: AsyncSession = Depends(get_db),
    id: int,
    item_in: TransactionUpdate,
) -> Any:
    item = await crud_transactions.transaction.get(db, id=id)
    if not item:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return await crud_transactions.transaction.update(db, db_obj=item, obj_in=item_in)

@router.get("/{id}", response_model=Transaction)
async def read_transaction(
    *,
    db: AsyncSession = Depends(get_db),
    id: int,
) -> Any:
    item = await crud_transactions.transaction.get(db, id=id)
    if not item:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return item

@router.delete("/{id}", response_model=Transaction)
async def delete_transaction(
    *,
    db: AsyncSession = Depends(get_db),
    id: int,
) -> Any:
    item = await crud_transactions.transaction.get(db, id=id)
    if not item:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return await crud_transactions.transaction.remove(db, id=id)
