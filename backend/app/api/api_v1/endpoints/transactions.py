from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.schemas.core import Transaction, TransactionCreate, TransactionUpdate, TransactionOut
from app.crud import crud_functions as crud_transactions
from app.db.session import get_db
from app.core.deps import get_current_active_user
from app.models.user import User
from app.models.transaction import Transaction as TransactionModel
from app.models.account import Account
from app.models.category import Category
from app.models.tag import Tag

router = APIRouter()

@router.get("/", response_model=List[TransactionOut])
async def read_transactions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    
    result = await db.execute(
        select(TransactionModel)
        .join(AccountModel, TransactionModel.account_id == AccountModel.id)
        .where(AccountModel.user_id == current_user.id)
        .options(selectinload(TransactionModel.category), selectinload(TransactionModel.tags))
        .offset(skip)
        .limit(limit)
    )
    return result.scalars().all()

@router.post("/", response_model=Transaction, response_model_by_alias=True)
async def create_transaction(
    *,
    db: AsyncSession = Depends(get_db),
    item_in: TransactionCreate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    
    # Ensure Account belongs to user
    account_result = await db.execute(select(Account).where(Account.id == item_in.account_id, Account.user_id == current_user.id))
    account = account_result.scalars().first()
    if not account:
        raise HTTPException(status_code=403, detail="Not authorized to use this account")

    # Prefill currency from account if not specified or different
    if not item_in.currency or item_in.currency == "USD": # Default fallback
        item_in.currency = account.currency

    # Handle category string to ID mapping
    if item_in.category_name:
        result = await db.execute(select(Category).where(Category.name == item_in.category_name, Category.user_id == current_user.id))
        existing_category = result.scalars().first()
        
        if existing_category:
            item_in.category_id = existing_category.id  # type: ignore
        else:
            new_category = Category(
                name=item_in.category_name,
                color="#666666",
                icon="help-circle",
                user_id=current_user.id
            )
            db.add(new_category)
            await db.commit()
            await db.refresh(new_category)
            item_in.category_id = new_category.id  # type: ignore

    # Provide tags to crud method (we need to fetch tag instances)
    tag_instances = []
    if item_in.tags:
        for tag_str in item_in.tags:
            tag_name = tag_str.strip()
            if not tag_name: continue
            
            tag_res = await db.execute(select(Tag).where(Tag.name == tag_name, Tag.user_id == current_user.id))
            existing_tag = tag_res.scalars().first()
            if existing_tag:
                tag_instances.append(existing_tag)
            else:
                new_tag = Tag(name=tag_name, user_id=current_user.id)
                db.add(new_tag)
                await db.commit()
                await db.refresh(new_tag)
                tag_instances.append(new_tag)

    # Note: crud_transaction.create doesn't know about tags list yet unless we pass it. 
    # Let's bypass the base crud and do it directly here to tie tags easily.
    obj_in_data = item_in.model_dump(exclude={'category_name', 'tags'})
    db_obj = TransactionModel(**obj_in_data)
    db_obj.tags = tag_instances
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    
    return db_obj

@router.put("/{id}", response_model=Transaction, response_model_by_alias=True)
async def update_transaction(
    *,
    db: AsyncSession = Depends(get_db),
    id: int,
    item_in: TransactionUpdate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    # Validate transaction access (left out simple query for brevity, assumed safe for single user context or implement account verify here too)
    item = await db.get(TransactionModel, id, options=[selectinload(TransactionModel.tags)])
    if not item:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # Verify account ownership
    account_result = await db.execute(select(Account).where(Account.id == item.account_id, Account.user_id == current_user.id))
    if not account_result.scalars().first():
         raise HTTPException(status_code=403, detail="Not authorized to edit this transaction")

    # Handle category update
    if item_in.category_name is not None:
        cat_result = await db.execute(select(Category).where(Category.name == item_in.category_name, Category.user_id == current_user.id))
        category = cat_result.scalars().first()
        if not category:
             category = Category(name=item_in.category_name, color="#666666", icon="help-circle", user_id=current_user.id)
             db.add(category)
             await db.commit()
             await db.refresh(category)
        item.category_id = category.id

    # Handle tags update
    if item_in.tags is not None:
        tag_instances = []
        for tag_str in item_in.tags:
            tag_name = tag_str.strip()
            if not tag_name: continue
            tag_res = await db.execute(select(Tag).where(Tag.name == tag_name, Tag.user_id == current_user.id))
            tag = tag_res.scalars().first()
            if not tag:
                tag = Tag(name=tag_name, user_id=current_user.id)
                db.add(tag)
                await db.commit()
                await db.refresh(tag)
            tag_instances.append(tag)
        item.tags = tag_instances

    # Update basic fields
    update_data = item_in.model_dump(exclude={'category_name', 'tags'}, exclude_unset=True)
    for key, value in update_data.items():
        setattr(item, key, value)
    
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item

@router.get("/{id}", response_model=Transaction, response_model_by_alias=True)
async def read_transaction(
    *,
    db: AsyncSession = Depends(get_db),
    id: int,
    current_user: User = Depends(get_current_active_user),
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
    current_user: User = Depends(get_current_active_user),
) -> Any:
    item = await crud_transactions.transaction.get(db, id=id)
    if not item:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return await crud_transactions.transaction.remove(db, id=id)
