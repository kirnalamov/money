from typing import Optional
from pydantic import BaseModel, ConfigDict
from datetime import datetime
from enum import Enum

# Shared properties
class CategoryBase(BaseModel):
    name: str
    icon: Optional[str] = None
    color: Optional[str] = None
    limit: Optional[float] = 0.0

class CategoryCreate(CategoryBase):
    pass

class CategoryUpdate(CategoryBase):
    pass

class CategoryInDBBase(CategoryBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class Category(CategoryInDBBase):
    pass

# Transaction Schemas
class TransactionType(str, Enum):
    INCOME = "income"
    EXPENSE = "expense"

class TransactionBase(BaseModel):
    amount: float
    description: Optional[str] = None
    date: Optional[datetime] = None
    type: TransactionType = TransactionType.EXPENSE
    category_id: Optional[int] = None

class TransactionCreate(TransactionBase):
    pass

class TransactionUpdate(TransactionBase):
    pass

class TransactionInDBBase(TransactionBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class Transaction(TransactionInDBBase):
    pass
