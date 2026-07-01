from sqlalchemy.orm import Session

from app.audit.service import AuditService
from app.core.config import settings
from app.core.security import hash_password
from app.database.session import SessionLocal
from app.users.models import User, UserRole, UserStatus
from app.users.repository import UserRepository


def ensure_first_admin() -> None:
    if not settings.first_admin_email or not settings.first_admin_password:
        return

    db: Session = SessionLocal()
    try:
        users = UserRepository(db)
        if users.get_by_email(settings.first_admin_email):
            return

        admin = User(
            first_name=settings.first_admin_first_name,
            last_name=settings.first_admin_last_name,
            email=settings.first_admin_email.lower(),
            phone_number="0000000000",
            role=UserRole.ADMIN,
            status=UserStatus.ACTIVE,
            password_hash=hash_password(settings.first_admin_password),
            must_change_password=True,
        )
        users.add(admin)
        db.flush()
        AuditService(db).record(
            actor_user_id=None,
            action="user.created",
            entity_type="user",
            entity_id=str(admin.id),
            metadata={"source": "bootstrap", "role": admin.role.value},
        )
        db.commit()
    finally:
        db.close()

