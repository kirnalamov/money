from typing import Annotated, Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_active_user, require_role
from app.core.security import validate_password_strength, verify_password
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
    if user_in.email is not None:
        existing_user = await crud_user.get_by_email(db, email=user_in.email)
        if existing_user and existing_user.id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A user with this email already exists",
            )

    if user_in.password is not None:
        if not user_in.current_password or not verify_password(user_in.current_password, current_user.hashed_password):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")
        is_valid, error_msg = validate_password_strength(user_in.password)
        if not is_valid:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error_msg)

    try:
        update_data = user_in.model_dump(exclude_unset=True, exclude={"current_password"})
        user = await crud_user.update(db, db_obj=current_user, obj_in=update_data)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists",
        )
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
