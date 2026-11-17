"""
Script to create a superuser for the application.
Can be run independently or as part of initialization.

Usage:
    python scripts/create_superuser.py
    
Or with environment variables:
    FIRST_SUPERUSER_EMAIL=admin@example.com \
    FIRST_SUPERUSER_USERNAME=admin \
    FIRST_SUPERUSER_PASSWORD=SecurePass123! \
    FIRST_SUPERUSER_FULL_NAME="Admin User" \
    python scripts/create_superuser.py
"""

import asyncio
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import structlog
from app.core.config import settings
from app.db.session import AsyncSessionLocal
from app.db.init_db import init_db
import app.db.base  # Register all models

logger = structlog.get_logger()


async def main():
    """Create initial superuser if configured."""
    logger.info("starting_superuser_creation")
    
    if (
        not settings.FIRST_SUPERUSER_EMAIL
        or not settings.FIRST_SUPERUSER_USERNAME
        or not settings.FIRST_SUPERUSER_PASSWORD
    ):
        logger.error(
            "missing_superuser_config",
            message="FIRST_SUPERUSER_EMAIL and FIRST_SUPERUSER_USERNAME must be set in environment"
        )
        print("\nError: Missing superuser configuration!")
        print("Please set the following environment variables:")
        print("  - FIRST_SUPERUSER_EMAIL")
        print("  - FIRST_SUPERUSER_USERNAME")
        print("  - FIRST_SUPERUSER_PASSWORD")
        print("  - FIRST_SUPERUSER_FULL_NAME (optional)")
        sys.exit(1)
    
    try:
        if sys.platform == 'win32':
            sys.stdout.reconfigure(encoding='utf-8')
        async with AsyncSessionLocal() as session:
            await init_db(session)
            await session.commit()
        
        logger.info("superuser_creation_complete")
        print("\n✓ Superuser creation process completed successfully!")
        print(f"  Email: {settings.FIRST_SUPERUSER_EMAIL}")
        print(f"  Username: {settings.FIRST_SUPERUSER_USERNAME}")
        
    except Exception as e:
        logger.error("superuser_creation_failed", error=str(e))
        print(f"\nFailed to create superuser: {e}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
