import asyncio
from app.db.session import AsyncSessionLocal
from app.crud.crud_user import user as crud_user

async def test_auth():
    async with AsyncSessionLocal() as db:
        user = await crud_user.authenticate(db, username="admin", password="ChangeMe123!")
        if user:
            print(f"Authentication SUCCESS for user: {user.username}")
        else:
            print("Authentication FAILED!")

if __name__ == "__main__":
    asyncio.run(test_auth())
