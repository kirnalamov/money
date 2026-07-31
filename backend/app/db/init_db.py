"""Database initialization module."""

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.crud.crud_user import user as crud_user
from app.schemas.user import UserCreate

logger = structlog.get_logger()


async def init_db(db: AsyncSession) -> None:
    """
    Initialize database with initial data.
    Creates first superuser if configured via environment variables.
    """
    # Create first superuser if configured
    if settings.FIRST_SUPERUSER_EMAIL and settings.FIRST_SUPERUSER_USERNAME:
        logger.info(
            "checking_for_initial_superuser",
            email=settings.FIRST_SUPERUSER_EMAIL
        )
        
        # Check if superuser already exists
        existing_user = await crud_user.get_by_email(
            db, email=settings.FIRST_SUPERUSER_EMAIL
        )
        
        if not existing_user:
            logger.info(
                "creating_initial_superuser",
                email=settings.FIRST_SUPERUSER_EMAIL,
                username=settings.FIRST_SUPERUSER_USERNAME
            )
            
            user_in = UserCreate(
                email=settings.FIRST_SUPERUSER_EMAIL,
                username=settings.FIRST_SUPERUSER_USERNAME,
                password=settings.FIRST_SUPERUSER_PASSWORD or "ChangeMe123!",
                full_name=settings.FIRST_SUPERUSER_FULL_NAME or "Admin User",
                is_active=True,
                role="admin"
            )
            
            try:
                await crud_user.create_superuser(db, obj_in=user_in)
                logger.info(
                    "initial_superuser_created",
                    email=settings.FIRST_SUPERUSER_EMAIL
                )
            except Exception as e:
                logger.error(
                    "failed_to_create_superuser",
                    email=settings.FIRST_SUPERUSER_EMAIL,
                    error=str(e)
                )
                raise
        else:
            logger.info(
                "superuser_already_exists",
                email=settings.FIRST_SUPERUSER_EMAIL
            )
    else:
        logger.info(
            "no_superuser_config",
            message="No superuser credentials found in environment. Skipping initial superuser creation."
        )
