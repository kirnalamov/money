from typing import Optional
from pydantic import BaseModel, ConfigDict
from datetime import datetime
from pydantic import Field
from app.schemas.core import Currency

# Goal
class GoalBase(BaseModel):
    name: str
    target_amount: float = Field(gt=0)
    current_amount: float = Field(default=0.0, ge=0)
    deadline: Optional[datetime] = None
    currency: Currency = Currency.USD
    linked_account_id: Optional[int] = None

class GoalCreate(GoalBase):
    pass

class GoalUpdate(GoalBase):
    name: Optional[str] = None
    target_amount: Optional[float] = Field(None, gt=0)
    current_amount: Optional[float] = Field(None, ge=0)
    deadline: Optional[datetime] = None
    currency: Optional[Currency] = None
    linked_account_id: Optional[int] = None

class Goal(GoalBase):
    id: int
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

# Savings
class SavingsBase(BaseModel):
    name: str
    balance: float = Field(default=0.0, ge=0)
    interest_rate: float = Field(default=0.0, ge=0)

class SavingsCreate(SavingsBase):
    pass

class SavingsUpdate(SavingsBase):
    name: Optional[str] = None
    balance: Optional[float] = Field(None, ge=0)
    interest_rate: Optional[float] = Field(None, ge=0)

class Savings(SavingsBase):
    id: int
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)
