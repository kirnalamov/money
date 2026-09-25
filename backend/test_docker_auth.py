import asyncio
from app.db.session import AsyncSessionLocal
from app.crud.crud_user import user as crud_user
from app.core.config import settings

async def test_auth():
    password = settings.FIRST_SUPERUSER_PASSWORD
    if not password:
        raise RuntimeError("Set FIRST_SUPERUSER_PASSWORD before running this check")

    async with AsyncSessionLocal() as db:
        user = await crud_user.authenticate(db, username="admin", password=password)
        if user:
            print(f"Authentication SUCCESS for user: {user.username}")
        else:
            print("Authentication FAILED!")

if __name__ == "__main__":
    asyncio.run(test_auth())
