from fastapi import APIRouter
from app.api.api_v1.endpoints import categories, transactions, goals, savings, auth, users, accounts

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(categories.router, prefix="/categories", tags=["categories"])
api_router.include_router(accounts.router, prefix="/accounts", tags=["accounts"])
api_router.include_router(transactions.router, prefix="/transactions", tags=["transactions"])
api_router.include_router(goals.router, prefix="/goals", tags=["goals"])
api_router.include_router(savings.router, prefix="/savings", tags=["savings"])

