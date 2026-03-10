from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.crud.base import CRUDBase
from app.models.refresh_token import RefreshToken
from pydantic import BaseModel

class RefreshTokenCreate(BaseModel):
    token: str
    user_id: int
    expires_at: datetime

class RefreshTokenUpdate(BaseModel):
    revoked: bool | None = None

class CRUDRefreshToken(CRUDBase[RefreshToken, RefreshTokenCreate, RefreshTokenUpdate]):
    async def get_by_token(
        self, db: AsyncSession, *, token: str
    ) -> RefreshToken | None:
        """Get refresh token by token string"""
        result = await db.execute(
            select(RefreshToken).filter(RefreshToken.token == token)
        )
        return result.scalar_one_or_none()
    
    async def revoke_token(
        self, db: AsyncSession, *, token: str
    ) -> RefreshToken | None:
        """Revoke a refresh token"""
        db_token = await self.get_by_token(db, token=token)
        if db_token:
            db_token.revoked = True  # type: ignore
            await db.commit()
            await db.refresh(db_token)
        return db_token
    
    async def revoke_all_user_tokens(
        self, db: AsyncSession, *, user_id: int
    ) -> None:
        """Revoke all refresh tokens for a user"""
        result = await db.execute(
            select(RefreshToken).filter(RefreshToken.user_id == user_id)
        )
        tokens = result.scalars().all()
        for token in tokens:
            token.revoked = True  # type: ignore
        await db.commit()
    
    async def cleanup_expired(self, db: AsyncSession) -> None:
        """Delete expired tokens from database"""
        result = await db.execute(
            select(RefreshToken).filter(RefreshToken.expires_at < datetime.utcnow())
        )
        tokens = result.scalars().all()
        for token in tokens:
            await db.delete(token)
        await db.commit()

refresh_token = CRUDRefreshToken(RefreshToken)
