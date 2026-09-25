from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional
from app.schemas.core import Currency

class AccountBase(BaseModel):
    name: str
    type: str
    balance: float = 0.0
    currency: Currency = Currency.USD

class AccountCreate(AccountBase):
    pass

class AccountUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    balance: Optional[float] = None
    currency: Optional[Currency] = None

class AccountInDBBase(AccountBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class Account(AccountInDBBase):
    pass
