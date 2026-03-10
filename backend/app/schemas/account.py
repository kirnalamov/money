from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional

class AccountBase(BaseModel):
    name: str
    type: str
    balance: float = 0.0
    currency: str = "USD"

class AccountCreate(AccountBase):
    pass

class AccountUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    balance: Optional[float] = None
    currency: Optional[str] = None

class AccountInDBBase(AccountBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class Account(AccountInDBBase):
    pass
