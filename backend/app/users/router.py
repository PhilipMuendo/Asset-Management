from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, require_admin
from app.users.models import User
from app.users.repository import UserRepository
from app.users.schemas import UserCreate, UserCreateResponse, UserRead, UserUpdate
from app.users.service import UserService

router = APIRouter()


@router.get("", response_model=list[UserRead])
def list_users(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
    limit: int = Query(2000, ge=1, le=5000),
    offset: int = Query(0, ge=0),
) -> list[User]:
    return UserRepository(db).list(limit=limit, offset=offset)


@router.post("", response_model=UserCreateResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> UserCreateResponse:
    user, temporary_password = UserService(db).create_user(payload, admin)
    response = UserCreateResponse.model_validate(user)
    response.temporary_password = temporary_password
    return response


@router.patch("/{user_id}", response_model=UserRead)
def update_user(
    user_id: int,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> User:
    return UserService(db).update_user(user_id, payload, admin)

