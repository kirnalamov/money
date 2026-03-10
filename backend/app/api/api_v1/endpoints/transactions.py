from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.core import Transaction, TransactionCreate, TransactionUpdate, TransactionOut
from app.crud import crud_functions as crud_transactions
from app.db.session import get_db


router = APIRouter()

@router.get("/", response_model=List[TransactionOut])
async def read_transactions(
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload
    from app.models.transaction import Transaction as TransactionModel
    
    result = await db.execute(
        select(TransactionModel)
        .options(selectinload(TransactionModel.category))
        .offset(skip)
        .limit(limit)
    )
    return result.scalars().all()

@router.post("/", response_model=Transaction, response_model_by_alias=True)
async def create_transaction(
    *,
    db: AsyncSession = Depends(get_db),
    item_in: TransactionCreate,
) -> Any:
    # Logic to handle category string to ID mapping
    if item_in.category_name:
        from app.models.category import Category
        from sqlalchemy import select
        
        # Check if category exists
        result = await db.execute(select(Category).where(Category.name == item_in.category_name))
        existing_category = result.scalars().first()
        
        if existing_category:
            item_in.category_id = existing_category.id  # type: ignore
        else:
            # Create new category
            new_category = Category(
                name=item_in.category_name,
                color="#666666", # Default color
                icon="help-circle" # Default icon
            )
            db.add(new_category)
            await db.commit()
            await db.refresh(new_category)
            item_in.category_id = new_category.id  # type: ignore
            
    return await crud_transactions.transaction.create(db, obj_in=item_in)

@router.put("/{id}", response_model=Transaction, response_model_by_alias=True)
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

@router.get("/{id}", response_model=Transaction, response_model_by_alias=True)
async def read_transaction(
    *,
    db: AsyncSession = Depends(get_db),
    id: int,
) -> Any:
    item = await crud_transactions.transaction.get(db, id=id)
    if not item:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return item

@router.delete("/{id}", response_model=Transaction, response_model_by_alias=True)
async def delete_transaction(
    *,
    db: AsyncSession = Depends(get_db),
    id: int,
) -> Any:
    item = await crud_transactions.transaction.get(db, id=id)
    if not item:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return await crud_transactions.transaction.remove(db, id=id)
