from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from sqlalchemy import select
from app.schemas.core import Tag, TagCreate, TagUpdate
from app.db.session import get_db
from app.core.deps import get_current_active_user
from app.models.user import User
from app.models.tag import Tag as TagModel

router = APIRouter()

@router.get("/", response_model=List[Tag])
async def read_tags(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    result = await db.execute(
        select(TagModel)
        .where(TagModel.user_id == current_user.id)
        .offset(skip)
        .limit(limit)
    )
    return result.scalars().all()

@router.post("/", response_model=Tag)
async def create_tag(
    *,
    db: AsyncSession = Depends(get_db),
    item_in: TagCreate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    db_obj = TagModel(**item_in.model_dump(), user_id=current_user.id)
    db.add(db_obj)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="A tag with this name already exists")
    await db.refresh(db_obj)
    return db_obj

@router.put("/{id}", response_model=Tag)
async def update_tag(
    *,
    db: AsyncSession = Depends(get_db),
    id: int,
    item_in: TagUpdate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    result = await db.execute(select(TagModel).where(TagModel.id == id, TagModel.user_id == current_user.id))
    item = result.scalars().first()
    if not item:
        raise HTTPException(status_code=404, detail="Tag not found")
    
    update_data = item_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(item, field, value)
        
    db.add(item)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="A tag with this name already exists")
    await db.refresh(item)
    return item

@router.delete("/{id}", response_model=Tag)
async def delete_tag(
    *,
    db: AsyncSession = Depends(get_db),
    id: int,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    result = await db.execute(select(TagModel).where(TagModel.id == id, TagModel.user_id == current_user.id))
    item = result.scalars().first()
    if not item:
        raise HTTPException(status_code=404, detail="Tag not found")
    
    await db.delete(item)
    await db.commit()
    return item
