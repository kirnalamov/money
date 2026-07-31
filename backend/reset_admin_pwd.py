import asyncio
from app.db.session import AsyncSessionLocal
from app.crud.crud_user import user as crud_user
from app.core.security import get_password_hash
import app.db.base # Register all models

async def reset_pwd():

    async with AsyncSessionLocal() as db:
        user = await crud_user.get_by_username(db, username="admin")
        if user:
            print(f"Resetting password for user: {user.username} (Email: {user.email})")
            user.hashed_password = get_password_hash("ChangeMe123!")
            db.add(user)
            await db.commit()
            print("Password reset successfully!")
        else:
            print("User 'admin' not found!")

if __name__ == "__main__":
    asyncio.run(reset_pwd())
