from datetime import datetime, timedelta
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.deps import get_current_active_user
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    validate_password_strength,
)
from app.crud.crud_user import user as crud_user
from app.crud.crud_refresh_token import refresh_token as crud_refresh_token, RefreshTokenCreate
from app.db.session import get_db
from app.middleware.rate_limit import get_rate_limiter
from app.models.user import User
from app.schemas.auth import Token, TokenRefresh, UserRegister
from app.schemas.user import User as UserSchema, UserCreate

router = APIRouter()

@router.post("/register", response_model=UserSchema, status_code=status.HTTP_201_CREATED)
async def register(
    *,
    db: Annotated[AsyncSession, Depends(get_db)],
    user_in: UserRegister,
    _: Annotated[None, Depends(get_rate_limiter(requests_per_minute=settings.AUTH_RATE_LIMIT_PER_MINUTE))],
) -> User:
    """
    Register a new user.
    """
    # Check if user already exists
    user_by_email = await crud_user.get_by_email(db, email=user_in.email)
    if user_by_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists"
        )
    
    user_by_username = await crud_user.get_by_username(db, username=user_in.username)
    if user_by_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this username already exists"
        )
    
    # Validate password strength
    is_valid, error_msg = validate_password_strength(user_in.password)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg
        )
    
    # Create new user
    user_create = UserCreate(**user_in.model_dump())
    user = await crud_user.create(db, obj_in=user_create)
    return user

@router.post("/login", response_model=Token)
async def login(
    *,
    db: Annotated[AsyncSession, Depends(get_db)],
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    _: Annotated[None, Depends(get_rate_limiter(requests_per_minute=settings.AUTH_RATE_LIMIT_PER_MINUTE))],
) -> dict:
    """
    OAuth2 compatible token login, get an access token for future requests.
    """
    # Authenticate user
    user = await crud_user.authenticate(
        db, username=form_data.username, password=form_data.password
    )
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not crud_user.is_active(user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user"
        )
    
    # Create tokens
    access_token = create_access_token(subject=str(user.id))
    refresh_token_str = create_refresh_token(subject=str(user.id))
    
    # Store refresh token in database
    refresh_token_obj = RefreshTokenCreate(
        token=refresh_token_str,
        user_id=user.id,  # type: ignore
        expires_at=datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    )
    await crud_refresh_token.create(db, obj_in=refresh_token_obj)
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token_str,
        "token_type": "bearer"
    }

@router.post("/refresh", response_model=Token)
async def refresh_access_token(
    *,
    db: Annotated[AsyncSession, Depends(get_db)],
    token_data: TokenRefresh,
) -> dict:
    """
    Refresh access token using refresh token.
    """
    # Decode refresh token
    payload = decode_token(token_data.refresh_token)
    if payload is None or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    # Check if token exists and is not revoked
    token_obj = await crud_refresh_token.get_by_token(db, token=token_data.refresh_token)
    if not token_obj or token_obj.revoked:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has been revoked"
        )
    
    # Check if token is expired
    if token_obj.expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has expired"
        )
    
    # Get user
    user_id = int(str(payload.get("sub")))
    user = await crud_user.get(db, id=user_id)
    if not user or not crud_user.is_active(user):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )
    
    # Create new tokens
    access_token = create_access_token(subject=str(user.id))
    new_refresh_token = create_refresh_token(subject=str(user.id))
    
    # Revoke old refresh token and create new one (token rotation)
    await crud_refresh_token.revoke_token(db, token=token_data.refresh_token)
    refresh_token_obj = RefreshTokenCreate(
        token=new_refresh_token,
        user_id=user.id,  # type: ignore
        expires_at=datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    )
    await crud_refresh_token.create(db, obj_in=refresh_token_obj)
    
    return {
        "access_token": access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer"
    }

@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    *,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
    token_data: TokenRefresh,
):
    """
    Logout by revoking the refresh token.
    """
    await crud_refresh_token.revoke_token(db, token=token_data.refresh_token)
    return None
