from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.schemas.various import Goal, GoalCreate, GoalUpdate
from app.db.session import get_db
from app.core.deps import get_current_active_user
from app.models.user import User
from app.models.various import Goal as GoalModel
from app.models.account import Account

router = APIRouter()


async def _validate_linked_account(
    db: AsyncSession,
    account_id: int | None,
    user_id: int,
) -> None:
    if account_id is None:
        return
    result = await db.execute(
        select(Account).where(
            Account.id == account_id,
            Account.user_id == user_id,
        )
    )
    if result.scalars().first() is None:
        raise HTTPException(status_code=403, detail="Not authorized to link this account")

@router.get("/", response_model=List[Goal])
async def read_goals(
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    result = await db.execute(
        select(GoalModel)
        .where(GoalModel.user_id == current_user.id)
        .offset(skip)
        .limit(limit)
    )
    return result.scalars().all()

@router.post("/", response_model=Goal)
async def create_goal(
    *,
    db: AsyncSession = Depends(get_db),
    item_in: GoalCreate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    await _validate_linked_account(db, item_in.linked_account_id, current_user.id)
    db_obj = GoalModel(**item_in.model_dump(), user_id=current_user.id)
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    return db_obj

@router.put("/{id}", response_model=Goal)
async def update_goal(
    *,
    db: AsyncSession = Depends(get_db),
    id: int,
    item_in: GoalUpdate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    result = await db.execute(
        select(GoalModel).where(
            GoalModel.id == id,
            GoalModel.user_id == current_user.id,
        )
    )
    item = result.scalars().first()
    if not item:
        raise HTTPException(status_code=404, detail="Goal not found")
    if "linked_account_id" in item_in.model_fields_set:
        await _validate_linked_account(db, item_in.linked_account_id, current_user.id)
    for field, value in item_in.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    await db.commit()
    await db.refresh(item)
    return item

@router.delete("/{id}", response_model=Goal)
async def delete_goal(
    *,
    db: AsyncSession = Depends(get_db),
    id: int,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    result = await db.execute(
        select(GoalModel).where(
            GoalModel.id == id,
            GoalModel.user_id == current_user.id,
        )
    )
    item = result.scalars().first()
    if not item:
        raise HTTPException(status_code=404, detail="Goal not found")
    await db.delete(item)
    await db.commit()
    return item
