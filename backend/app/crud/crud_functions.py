from app.crud.base import CRUDBase
from app.models.category import Category
from app.models.transaction import Transaction
from app.models.various import Goal, Savings
from app.schemas.core import CategoryCreate, CategoryUpdate, TransactionCreate, TransactionUpdate
from app.schemas.various import GoalCreate, GoalUpdate, SavingsCreate, SavingsUpdate

class CRUDCategory(CRUDBase[Category, CategoryCreate, CategoryUpdate]):
    pass

class CRUDTransaction(CRUDBase[Transaction, TransactionCreate, TransactionUpdate]):
    pass

class CRUDGoal(CRUDBase[Goal, GoalCreate, GoalUpdate]):
    pass

class CRUDSavings(CRUDBase[Savings, SavingsCreate, SavingsUpdate]):
    pass

category = CRUDCategory(Category)
transaction = CRUDTransaction(Transaction)
goal = CRUDGoal(Goal)
savings = CRUDSavings(Savings)
