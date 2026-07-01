from datetime import UTC, datetime

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.audit.service import AuditService
from app.core.security import hash_password, verify_password
from app.users.models import User, UserStatus
from app.users.repository import UserRepository


class AuthService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.users = UserRepository(db)
        self.audit = AuditService(db)

    def authenticate(self, email: str, password: str) -> User:
        user = self.users.get_by_email(email)
        if not user or not verify_password(password, user.password_hash):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
        if user.status != UserStatus.ACTIVE:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is not active")

        user.last_login_at = datetime.now(UTC)
        self.audit.record(
            actor_user_id=user.id,
            action="auth.login",
            entity_type="user",
            entity_id=str(user.id),
            metadata={"email": user.email},
        )
        self.db.commit()
        self.db.refresh(user)
        return user

    def change_password(self, user: User, current_password: str, new_password: str) -> User:
        if not verify_password(current_password, user.password_hash):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password invalid")
        if verify_password(new_password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="New password must be different",
            )

        user.password_hash = hash_password(new_password)
        user.must_change_password = False
        self.audit.record(
            actor_user_id=user.id,
            action="password.changed",
            entity_type="user",
            entity_id=str(user.id),
            metadata={},
        )
        self.db.commit()
        self.db.refresh(user)
        return user

