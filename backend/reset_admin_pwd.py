import asyncio
from app.db.session import AsyncSessionLocal
from app.crud.crud_user import user as crud_user
from app.core.security import get_password_hash
from app.core.security import validate_password_strength
from app.core.config import settings
import app.db.base # Register all models

async def reset_pwd():
    password = settings.FIRST_SUPERUSER_PASSWORD
    if not password:
        raise RuntimeError("Set FIRST_SUPERUSER_PASSWORD before resetting the password")

    is_valid, error = validate_password_strength(password)
    if not is_valid:
        raise ValueError(error)

    async with AsyncSessionLocal() as db:
        user = await crud_user.get_by_username(db, username="admin")
        if user:
            print(f"Resetting password for user: {user.username} (Email: {user.email})")
            user.hashed_password = get_password_hash(password)
            db.add(user)
            await db.commit()
            print("Password reset successfully!")
        else:
            print("User 'admin' not found!")

if __name__ == "__main__":
    asyncio.run(reset_pwd())
