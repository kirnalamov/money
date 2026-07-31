import asyncio
from datetime import datetime, timedelta

from app.db.session import AsyncSessionLocal
from app.models.refresh_token import RefreshToken # Fix mapper error
from app.models.user import User
from app.crud.crud_user import user as crud_user
from app.crud.crud_account import account as crud_account
from app.crud.crud_functions import transaction as crud_transaction, goal as crud_goal
from app.schemas.account import AccountCreate
from app.schemas.core import TransactionCreate
from app.schemas.various import GoalCreate

async def seed_data():
    async with AsyncSessionLocal() as db:
        user = await crud_user.get_by_username(db, username="devuser")
        if not user:
            print("devuser not found!")
            return
            
        print("Cleaning up existing dev data...")
        accounts = await crud_account.get_multi(db, limit=1000)
        for acc in accounts:
            if acc.user_id == user.id:
                await crud_account.remove(db, id=acc.id)
                
        goals = await crud_goal.get_multi(db, limit=100)
        for g in goals:
            await crud_goal.remove(db, id=g.id)

        print("Creating Accounts...")
        main_acc = await crud_account.create_with_owner(
            db, 
            obj_in=AccountCreate(name="Main Checking - Flat", type="bank", currency="USD", balance=5000.0),
            user_id=user.id
        )
        saving_acc = await crud_account.create_with_owner(
            db, 
            obj_in=AccountCreate(name="Long Term - Positive Trend", type="savings", currency="USD", balance=15000.0),
            user_id=user.id
        )
        credit_acc = await crud_account.create_with_owner(
            db, 
            obj_in=AccountCreate(name="Credit Card - Negative Trend", type="credit", currency="USD", balance=-1200.0),
            user_id=user.id
        )
        
        async def make_tx(acc_id, amount, desc, t_type, cat, days_ago):
            date_time = datetime.utcnow() - timedelta(days=days_ago) # Use UTC for ISO format compatibility
            await crud_transaction.create(
                db,
                obj_in=TransactionCreate(
                    amount=amount,
                    currency="USD",
                    description=desc,
                    date=date_time.isoformat() + "Z", # Ensure correct string format if expecting Pydantic parsing
                    type=t_type,
                    category=cat,
                    account_id=acc_id
                )
            )

        print("Creating transactions...")
        
        # 1. Flat Trend Data (Main Account)
        await make_tx(main_acc.id, 4000.0, "Salary", "income", "Salary", 28)
        await make_tx(main_acc.id, 1200.0, "Rent", "expense", "Housing", 27)
        await make_tx(main_acc.id, 600.0, "Groceries", "expense", "Food", 20)
        await make_tx(main_acc.id, 500.0, "Utilities", "expense", "Utilities", 15)
        await make_tx(main_acc.id, 1000.0, "Car Payment", "expense", "Transport", 10)
        await make_tx(main_acc.id, 700.0, "Extra Spends", "expense", "Entertainment", 5)

        # 2. Positive Trend Data (Savings Account)
        await make_tx(saving_acc.id, 2000.0, "Initial Deposit", "income", "Savings", 90)
        await make_tx(saving_acc.id, 500.0, "Monthly Transfer", "income", "Transfers", 60)
        await make_tx(saving_acc.id, 500.0, "Monthly Transfer", "income", "Transfers", 30)
        await make_tx(saving_acc.id, 500.0, "Monthly Transfer", "income", "Transfers", 5)
        await make_tx(saving_acc.id, 150.0, "Interest", "income", "Investments", 1)

        # 3. Negative Trend Data (Credit Account)
        await make_tx(credit_acc.id, 300.0, "Dining Out", "expense", "Dining Out", 45)
        await make_tx(credit_acc.id, 450.0, "Shopping Spree", "expense", "Shopping", 30)
        await make_tx(credit_acc.id, 200.0, "Electronics", "expense", "Shopping", 15)
        await make_tx(credit_acc.id, 400.0, "Payment", "income", "Transfers", 14) 
        await make_tx(credit_acc.id, 800.0, "Unexpected repair", "expense", "Housing", 2)

        print("Creating Goals...")
        await crud_goal.create(
            db,
            obj_in=GoalCreate(
                name="Dream House",
                target_amount=150000.0,
                current_amount=15000.0,
                deadline=(datetime.utcnow() + timedelta(days=365*3)).isoformat() + "Z"
            )
        )
        
        await db.commit()
        print("Seed data successfully injected!")

if __name__ == "__main__":
    asyncio.run(seed_data())
