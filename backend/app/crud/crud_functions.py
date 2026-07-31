from app.crud.base import CRUDBase
from app.models.category import Category
from app.models.transaction import Transaction
from app.models.various import Goal, Savings
from app.schemas.core import CategoryCreate, CategoryUpdate, TransactionCreate, TransactionUpdate
from app.schemas.various import GoalCreate, GoalUpdate, SavingsCreate, SavingsUpdate

class CRUDCategory(CRUDBase[Category, CategoryCreate, CategoryUpdate]):
    pass

class CRUDTransaction(CRUDBase[Transaction, TransactionCreate, TransactionUpdate]):
    async def create(self, db, *, obj_in: TransactionCreate) -> Transaction:
        obj_in_data = obj_in.model_dump(exclude={'category_name'})
        db_obj = self.model(**obj_in_data)
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

class CRUDGoal(CRUDBase[Goal, GoalCreate, GoalUpdate]):
    pass

class CRUDSavings(CRUDBase[Savings, SavingsCreate, SavingsUpdate]):
    pass

category = CRUDCategory(Category)
transaction = CRUDTransaction(Transaction)
goal = CRUDGoal(Goal)
savings = CRUDSavings(Savings)
