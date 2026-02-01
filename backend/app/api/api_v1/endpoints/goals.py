from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.various import Goal, GoalCreate, GoalUpdate
from app.crud import crud_functions
from app.db.session import get_db

router = APIRouter()

@router.get("/", response_model=List[Goal])
async def read_goals(
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    return await crud_functions.goal.get_multi(db, skip=skip, limit=limit)

@router.post("/", response_model=Goal)
async def create_goal(
    *,
    db: AsyncSession = Depends(get_db),
    item_in: GoalCreate,
) -> Any:
    return await crud_functions.goal.create(db, obj_in=item_in)

@router.put("/{id}", response_model=Goal)
async def update_goal(
    *,
    db: AsyncSession = Depends(get_db),
    id: int,
    item_in: GoalUpdate,
) -> Any:
    item = await crud_functions.goal.get(db, id=id)
    if not item:
        raise HTTPException(status_code=404, detail="Goal not found")
    return await crud_functions.goal.update(db, db_obj=item, obj_in=item_in)

@router.delete("/{id}", response_model=Goal)
async def delete_goal(
    *,
    db: AsyncSession = Depends(get_db),
    id: int,
) -> Any:
    item = await crud_functions.goal.get(db, id=id)
    if not item:
        raise HTTPException(status_code=404, detail="Goal not found")
    return await crud_functions.goal.remove(db, id=id)
