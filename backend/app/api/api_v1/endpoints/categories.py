from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.core import Category, CategoryCreate, CategoryUpdate
from app.crud import crud_functions as crud_cat
from app.db.session import get_db

router = APIRouter()

@router.get("/", response_model=List[Category])
async def read_categories(
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    return await crud_cat.category.get_multi(db, skip=skip, limit=limit)

@router.post("/", response_model=Category)
async def create_category(
    *,
    db: AsyncSession = Depends(get_db),
    item_in: CategoryCreate,
) -> Any:
    return await crud_cat.category.create(db, obj_in=item_in)

@router.put("/{id}", response_model=Category)
async def update_category(
    *,
    db: AsyncSession = Depends(get_db),
    id: int,
    item_in: CategoryUpdate,
) -> Any:
    item = await crud_cat.category.get(db, id=id)
    if not item:
        raise HTTPException(status_code=404, detail="Category not found")
    return await crud_cat.category.update(db, db_obj=item, obj_in=item_in)

@router.get("/{id}", response_model=Category)
async def read_category(
    *,
    db: AsyncSession = Depends(get_db),
    id: int,
) -> Any:
    item = await crud_cat.category.get(db, id=id)
    if not item:
        raise HTTPException(status_code=404, detail="Category not found")
    return item

@router.delete("/{id}", response_model=Category)
async def delete_category(
    *,
    db: AsyncSession = Depends(get_db),
    id: int,
) -> Any:
    item = await crud_cat.category.get(db, id=id)
    if not item:
        raise HTTPException(status_code=404, detail="Category not found")
    return await crud_cat.category.remove(db, id=id)
