from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.schemas.core import Category, CategoryCreate, CategoryUpdate
from app.crud import crud_functions as crud_cat
from app.db.session import get_db
from app.core.deps import get_current_active_user
from app.models.user import User

router = APIRouter()

@router.get("/", response_model=List[Category])
async def read_categories(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    from app.models.category import Category as CategoryModel
    result = await db.execute(
        select(CategoryModel)
        .where(CategoryModel.user_id == current_user.id)
        .offset(skip)
        .limit(limit)
    )
    return result.scalars().all()

@router.post("/", response_model=Category)
async def create_category(
    *,
    db: AsyncSession = Depends(get_db),
    item_in: CategoryCreate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    # Need to manually set user_id since base crud doesn't know it
    from app.models.category import Category as CategoryModel
    obj_in_data = item_in.model_dump()
    print("DEBUG current_user:", current_user)
    print("DEBUG current_user.id:", current_user.id)
    db_obj = CategoryModel(**obj_in_data, user_id=current_user.id)
    print("DEBUG db_obj user_id:", getattr(db_obj, 'user_id', 'MISSING'))
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    return db_obj

@router.put("/{id}", response_model=Category)
async def update_category(
    *,
    db: AsyncSession = Depends(get_db),
    id: int,
    item_in: CategoryUpdate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    item = await crud_cat.category.get(db, id=id)
    if not item or item.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Category not found")
    return await crud_cat.category.update(db, db_obj=item, obj_in=item_in)

@router.get("/{id}", response_model=Category)
async def read_category(
    *,
    db: AsyncSession = Depends(get_db),
    id: int,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    item = await crud_cat.category.get(db, id=id)
    if not item or item.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Category not found")
    return item

@router.delete("/{id}", response_model=Category)
async def delete_category(
    *,
    db: AsyncSession = Depends(get_db),
    id: int,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    item = await crud_cat.category.get(db, id=id)
    if not item or item.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Category not found")
    return await crud_cat.category.remove(db, id=id)
