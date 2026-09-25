from typing import Optional
from pydantic import BaseModel, ConfigDict, Field
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

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    limit: Optional[float] = None

class CategoryInDBBase(CategoryBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class Category(CategoryInDBBase):
    pass

# Tag Schemas
class TagBase(BaseModel):
    name: str
    color: Optional[str] = None

class TagCreate(TagBase):
    pass

class TagUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None

class TagInDBBase(TagBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class Tag(TagInDBBase):
    pass

# Transaction Schemas
class TransactionType(str, Enum):
    INCOME = "income"
    EXPENSE = "expense"
    TRANSFER = "transfer"


class Currency(str, Enum):
    USD = "USD"
    EUR = "EUR"
    GBP = "GBP"
    RUB = "RUB"

from pydantic import field_validator

class TransactionBase(BaseModel):
    amount: float = Field(gt=0)
    description: Optional[str] = None
    date: Optional[datetime] = None
    type: TransactionType = TransactionType.EXPENSE
    currency: Currency = Currency.USD
    category_id: Optional[int] = Field(None, alias="categoryId")
    # Frontend sends 'accountId' and 'category' (string)
    account_id: int = Field(alias="accountId")
    
    to_account_id: Optional[int] = Field(None, alias="toAccountId")

    model_config = ConfigDict(populate_by_name=True)

class TransactionCreate(TransactionBase):
    currency: Optional[Currency] = None
    category_name: Optional[str] = Field(None, alias="category")
    tags: Optional[list[str]] = None

class TransactionUpdate(BaseModel):
    amount: Optional[float] = Field(None, gt=0)
    description: Optional[str] = None
    date: Optional[datetime] = None
    type: Optional[TransactionType] = None
    currency: Optional[Currency] = None
    category_id: Optional[int] = Field(None, alias="categoryId")
    account_id: Optional[int] = Field(None, alias="accountId")
    to_account_id: Optional[int] = Field(None, alias="toAccountId")
    category_name: Optional[str] = Field(None, alias="category")
    tags: Optional[list[str]] = None

    model_config = ConfigDict(populate_by_name=True)

class TransactionInDBBase(TransactionBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    # Expose just the category name as "category" string
    category_name: Optional[str] = Field(None, alias="category")
    tags: Optional[list[str]] = None

    @field_validator("category_name", mode="before")
    def extract_category_name(cls, v):
        if hasattr(v, "name"):
            return v.name
        return v
        
    @field_validator("tags", mode="before")
    def extract_tag_names(cls, v):
        if v is None:
            return []
        if isinstance(v, list) and len(v) > 0 and hasattr(v[0], "name"):
            return [tag.name for tag in v]
        return v
        
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

class Transaction(TransactionInDBBase):
    pass

class TransactionOut(BaseModel):
    id: int
    amount: float
    description: Optional[str] = None
    date: Optional[datetime] = None
    type: TransactionType
    currency: Currency
    account_id: int = Field(alias="accountId")
    to_account_id: Optional[int] = Field(None, alias="toAccountId")
    category: Optional[str] = None
    tags: Optional[list[str]] = None
    created_at: datetime
    updated_at: datetime
    
    @field_validator("category", mode="before")
    def extract_category_name(cls, v):
        if hasattr(v, "name"):
            return v.name
        return v
        
    @field_validator("tags", mode="before")
    def extract_tag_names(cls, v):
        if v is None:
            return []
        if isinstance(v, list) and len(v) > 0 and hasattr(v[0], "name"):
            return [tag.name for tag in v]
        return v
    
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
