from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.schemas.various import Savings, SavingsCreate, SavingsUpdate
from app.db.session import get_db
from app.core.deps import get_current_active_user
from app.models.user import User
from app.models.various import Savings as SavingsModel

router = APIRouter()

@router.get("/", response_model=List[Savings])
async def read_savings(
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    result = await db.execute(
        select(SavingsModel)
        .where(SavingsModel.user_id == current_user.id)
        .offset(skip)
        .limit(limit)
    )
    return result.scalars().all()

@router.post("/", response_model=Savings)
async def create_savings(
    *,
    db: AsyncSession = Depends(get_db),
    item_in: SavingsCreate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    db_obj = SavingsModel(**item_in.model_dump(), user_id=current_user.id)
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    return db_obj

@router.put("/{id}", response_model=Savings)
async def update_savings(
    *,
    db: AsyncSession = Depends(get_db),
    id: int,
    item_in: SavingsUpdate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    result = await db.execute(
        select(SavingsModel).where(
            SavingsModel.id == id,
            SavingsModel.user_id == current_user.id,
        )
    )
    item = result.scalars().first()
    if not item:
        raise HTTPException(status_code=404, detail="Savings not found")
    for field, value in item_in.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    await db.commit()
    await db.refresh(item)
    return item

@router.delete("/{id}", response_model=Savings)
async def delete_savings(
    *,
    db: AsyncSession = Depends(get_db),
    id: int,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    result = await db.execute(
        select(SavingsModel).where(
            SavingsModel.id == id,
            SavingsModel.user_id == current_user.id,
        )
    )
    item = result.scalars().first()
    if not item:
        raise HTTPException(status_code=404, detail="Savings not found")
    await db.delete(item)
    await db.commit()
    return item
