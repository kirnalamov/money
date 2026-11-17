from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime
from typing import Optional
from app.schemas.core import Currency
from app.schemas.money import Money

class AccountBase(BaseModel):
    name: str
    type: str
    balance: Money = 0
    currency: Currency = Currency.USD
    provider: Optional[str] = Field(None, max_length=100)
    interest_rate: Optional[float] = Field(None, ge=0, le=100, allow_inf_nan=False)

class AccountCreate(AccountBase):
    pass

class AccountUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    balance: Optional[Money] = None
    expected_balance: Optional[Money] = None
    currency: Optional[Currency] = None
    provider: Optional[str] = Field(None, max_length=100)
    interest_rate: Optional[float] = Field(None, ge=0, le=100, allow_inf_nan=False)

class AccountInDBBase(AccountBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class Account(AccountInDBBase):
    pass
