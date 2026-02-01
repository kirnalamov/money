from typing import Optional
from pydantic import BaseModel, ConfigDict
from datetime import datetime

# Goal
class GoalBase(BaseModel):
    name: str
    target_amount: float
    current_amount: float = 0.0
    deadline: Optional[datetime] = None

class GoalCreate(GoalBase):
    pass

class GoalUpdate(GoalBase):
    pass

class Goal(GoalBase):
    id: int
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

# Savings
class SavingsBase(BaseModel):
    name: str
    balance: float = 0.0
    interest_rate: float = 0.0

class SavingsCreate(SavingsBase):
    pass

class SavingsUpdate(SavingsBase):
    pass

class Savings(SavingsBase):
    id: int
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)
