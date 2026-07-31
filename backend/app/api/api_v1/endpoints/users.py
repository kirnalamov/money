from typing import Annotated, Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_active_user, require_role
from app.crud.crud_user import user as crud_user
from app.db.session import get_db
from app.models.user import User as UserModel
from app.schemas.user import User, UserUpdate

router = APIRouter()

@router.get("/me", response_model=User)
async def read_current_user(
    current_user: Annotated[UserModel, Depends(get_current_active_user)]
) -> UserModel:
    """
    Get current user profile.
    """
    return current_user

@router.put("/me", response_model=User)
async def update_current_user(
    *,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[UserModel, Depends(get_current_active_user)],
    user_in: UserUpdate,
) -> UserModel:
    """
    Update current user profile.
    """
    # Users can only update their own profile
    user = await crud_user.update(db, db_obj=current_user, obj_in=user_in)
    return user

@router.get("/", response_model=List[User])
async def read_users(
    *,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[UserModel, Depends(require_role("admin"))],
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    List all users (admin only).
    """
    users = await crud_user.get_multi(db, skip=skip, limit=limit)
    return users

@router.get("/{user_id}", response_model=User)
async def read_user_by_id(
    *,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[UserModel, Depends(require_role("admin"))],
    user_id: int,
) -> UserModel:
    """
    Get a specific user by ID (admin only).
    """
    user = await crud_user.get(db, id=user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user
