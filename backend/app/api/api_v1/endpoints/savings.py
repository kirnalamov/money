from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.various import Savings, SavingsCreate, SavingsUpdate
from app.crud import crud_functions
from app.db.session import get_db

router = APIRouter()

@router.get("/", response_model=List[Savings])
async def read_savings(
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    return await crud_functions.savings.get_multi(db, skip=skip, limit=limit)

@router.post("/", response_model=Savings)
async def create_savings(
    *,
    db: AsyncSession = Depends(get_db),
    item_in: SavingsCreate,
) -> Any:
    return await crud_functions.savings.create(db, obj_in=item_in)

@router.put("/{id}", response_model=Savings)
async def update_savings(
    *,
    db: AsyncSession = Depends(get_db),
    id: int,
    item_in: SavingsUpdate,
) -> Any:
    item = await crud_functions.savings.get(db, id=id)
    if not item:
        raise HTTPException(status_code=404, detail="Savings not found")
    return await crud_functions.savings.update(db, db_obj=item, obj_in=item_in)

@router.delete("/{id}", response_model=Savings)
async def delete_savings(
    *,
    db: AsyncSession = Depends(get_db),
    id: int,
) -> Any:
    item = await crud_functions.savings.get(db, id=id)
    if not item:
        raise HTTPException(status_code=404, detail="Savings not found")
    return await crud_functions.savings.remove(db, id=id)
