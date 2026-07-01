from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.audit.service import AuditService
from app.core.security import generate_temporary_password, hash_password
from app.departments.repository import DepartmentRepository
from app.users.models import User, UserStatus
from app.users.repository import UserRepository
from app.users.schemas import UserCreate, UserUpdate
from app.utils.email import EmailClient, WelcomeEmail


class UserService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.users = UserRepository(db)
        self.departments = DepartmentRepository(db)
        self.audit = AuditService(db)

    def create_user(self, payload: UserCreate, actor: User) -> User:
        if self.users.get_by_email(payload.email):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already exists")

        if payload.department_id:
            department = self.departments.get_by_id(payload.department_id)
            if not department or department.is_archived:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid department")

        temporary_password = generate_temporary_password()
        user = self.users.add(
            User(
                first_name=payload.first_name,
                last_name=payload.last_name,
                email=payload.email.lower(),
                phone_number=payload.phone_number,
                department_id=payload.department_id,
                job_title=payload.job_title,
                role=payload.role,
                status=payload.status,
                password_hash=hash_password(temporary_password),
                must_change_password=True,
            )
        )
        self.db.flush()

        EmailClient().send_welcome_email(
            WelcomeEmail(
                to_email=user.email,
                full_name=user.full_name,
                temporary_password=temporary_password,
            )
        )
        self.audit.record(
            actor_user_id=actor.id,
            action="user.created",
            entity_type="user",
            entity_id=str(user.id),
            metadata={"email": user.email, "role": user.role.value, "status": user.status.value},
        )
        self.db.commit()
        self.db.refresh(user)
        return user

    def update_user(self, user_id: int, payload: UserUpdate, actor: User) -> User:
        user = self.users.get_by_id(user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

        updates = payload.model_dump(exclude_unset=True)
        if "department_id" in updates and updates["department_id"]:
            department = self.departments.get_by_id(updates["department_id"])
            if not department or department.is_archived:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid department")

        for field, value in updates.items():
            setattr(user, field, value)

        self.audit.record(
            actor_user_id=actor.id,
            action="user.updated",
            entity_type="user",
            entity_id=str(user.id),
            metadata={"fields": sorted(updates.keys())},
        )
        if payload.status == UserStatus.SUSPENDED:
            self.audit.record(
                actor_user_id=actor.id,
                action="user.suspended",
                entity_type="user",
                entity_id=str(user.id),
                metadata={"email": user.email},
            )
        if payload.status == UserStatus.ARCHIVED:
            self.audit.record(
                actor_user_id=actor.id,
                action="user.archived",
                entity_type="user",
                entity_id=str(user.id),
                metadata={"email": user.email},
            )

        self.db.commit()
        self.db.refresh(user)
        return user

