import asyncio
from app.db.session import AsyncSessionLocal
from app.db.init_db import init_db
import app.db.base

async def main():
    async with AsyncSessionLocal() as session:
        await init_db(session)
        await session.commit()
    print("Database initialized and superuser created (if configured).")

if __name__ == "__main__":
    asyncio.run(main())
