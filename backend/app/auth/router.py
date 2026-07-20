from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.auth.schemas import AuthResponse, ChangePasswordRequest, LoginRequest
from app.auth.service import AuthService
from app.core.config import settings
from app.core.dependencies import get_current_user, get_db
from app.core.security import create_access_token
from app.users.models import User, UserRole
from app.users.schemas import CurrentUserRead, UserRead
from app.users.service import UserService

router = APIRouter()


def _current_user_read(db: Session, user: User) -> CurrentUserRead:
    user.category_ids = UserService(db).get_category_ids(user.id) if user.role == UserRole.ADMIN else []
    if not hasattr(user, "session_branch_id"):
        user.session_branch_id = None
    return CurrentUserRead.model_validate(user)


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)) -> AuthResponse:
    auth_service = AuthService(db)
    user = auth_service.authenticate(payload.email, payload.password)
    session_branch_id = auth_service.resolve_session_branch_id(user, payload.branch_id)
    token = create_access_token(str(user.id), branch_id=session_branch_id)
    response.set_cookie(
        key=settings.cookie_name,
        value=token,
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
        max_age=settings.access_token_expire_minutes * 60,
    )
    user.session_branch_id = session_branch_id
    return AuthResponse(user=_current_user_read(db, user), must_change_password=user.must_change_password)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(response: Response) -> None:
    response.delete_cookie(key=settings.cookie_name)


@router.get("/me", response_model=CurrentUserRead)
def me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> CurrentUserRead:
    return _current_user_read(db, current_user)


@router.post("/change-password", response_model=UserRead)
def change_password(
    payload: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> User:
    return AuthService(db).change_password(
        current_user,
        current_password=payload.current_password,
        new_password=payload.new_password,
    )

