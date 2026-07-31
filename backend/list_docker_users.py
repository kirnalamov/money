import asyncio
from app.db.session import AsyncSessionLocal
from sqlalchemy import text
import app.db.base

async def list_users():
    async with AsyncSessionLocal() as session:
        result = await session.execute(text("SELECT id, email, username, role, is_superuser FROM users;"))
        users = result.all()
        print("ID | Email | Username | Role | Superuser")
        print("-" * 50)
        for user in users:
            print(f"{user[0]} | {user[1]} | {user[2]} | {user[3]} | {user[4]}")

if __name__ == "__main__":
    asyncio.run(list_users())
