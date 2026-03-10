from typing import Any
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.crud.base import CRUDBase
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate
from app.core.security import get_password_hash, verify_password

class CRUDUser(CRUDBase[User, UserCreate, UserUpdate]):
    async def get_by_email(self, db: AsyncSession, *, email: str) -> User | None:
        """Get user by email"""
        result = await db.execute(select(User).filter(User.email == email))
        return result.scalar_one_or_none()
    
    async def get_by_username(self, db: AsyncSession, *, username: str) -> User | None:
        """Get user by username"""
        result = await db.execute(select(User).filter(User.username == username))
        return result.scalar_one_or_none()
    
    async def create(self, db: AsyncSession, *, obj_in: UserCreate) -> User:
        """Create new user with hashed password"""
        db_obj = User(
            email=obj_in.email,
            username=obj_in.username,
            hashed_password=get_password_hash(obj_in.password),
            full_name=obj_in.full_name,
            is_active=obj_in.is_active,
            role=obj_in.role,
            is_superuser=False,  # Never allow creating superuser via API
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj
    
    async def create_superuser(
        self, db: AsyncSession, *, obj_in: UserCreate
    ) -> User:
        """Create superuser (for initial setup only)"""
        db_obj = User(
            email=obj_in.email,
            username=obj_in.username,
            hashed_password=get_password_hash(obj_in.password),
            full_name=obj_in.full_name,
            is_active=True,
            is_superuser=True,
            role="admin"
        )
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj
    
    async def update(
        self, db: AsyncSession, *, db_obj: User, obj_in: UserUpdate | dict[str, Any]
    ) -> User:
        """Update user, hashing password if provided"""
        if isinstance(obj_in, dict):
            update_data = obj_in
        else:
            update_data = obj_in.model_dump(exclude_unset=True)
        
        if "password" in update_data:
            hashed_password = get_password_hash(update_data["password"])
            del update_data["password"]
            update_data["hashed_password"] = hashed_password
        
        return await super().update(db, db_obj=db_obj, obj_in=update_data)
    
    async def authenticate(
        self, db: AsyncSession, *, username: str, password: str
    ) -> User | None:
        """Authenticate user by username and password"""
        user = await self.get_by_username(db, username=username)
        if not user:
            return None
        if not verify_password(password, user.hashed_password):  # type: ignore
            return None
        return user
    
    def is_active(self, user: User) -> bool:
        """Check if user is active"""
        return user.is_active  # type: ignore
    
    def is_superuser(self, user: User) -> bool:
        """Check if user is superuser"""
        return user.is_superuser  # type: ignore

user = CRUDUser(User)
