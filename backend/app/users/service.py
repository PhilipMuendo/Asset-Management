from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.assets.repository import CategoryRepository
from app.audit.service import AuditService
from app.branches.repository import BranchRepository
from app.core.security import generate_temporary_password, hash_password
from app.departments.repository import DepartmentRepository
from app.users.models import User, UserRole, UserStatus
from app.users.repository import CategoryAssignmentRepository, UserRepository
from app.users.schemas import UserCreate, UserCreateResponse, UserUpdate
from app.utils.email import EmailClient, WelcomeEmail


class UserService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.users = UserRepository(db)
        self.departments = DepartmentRepository(db)
        self.branches = BranchRepository(db)
        self.categories = CategoryRepository(db)
        self.category_assignments = CategoryAssignmentRepository(db)
        self.audit = AuditService(db)

    def _assert_can_set_role_and_branch(
        self, actor: User, target_role: UserRole, branch_id: int | None
    ) -> None:
        if target_role in (UserRole.ADMIN, UserRole.SUPERADMIN) and actor.role != UserRole.SUPERADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only a superadmin can assign admin or superadmin roles",
            )
        if target_role == UserRole.ADMIN:
            if branch_id is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="A branch must be assigned to a branch admin account",
                )
            branch = self.branches.get_by_id(branch_id)
            if not branch or branch.is_archived:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or archived branch")
        elif branch_id is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="branch_id can only be set for branch admin accounts",
            )

    def create_user(self, payload: UserCreate, actor: User) -> tuple[User, str]:
        if self.users.get_by_email(payload.email):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already exists")

        if payload.department_id:
            department = self.departments.get_by_id(payload.department_id)
            if not department or department.is_archived:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid department")

        self._assert_can_set_role_and_branch(actor, payload.role, payload.branch_id)

        temporary_password = payload.password if payload.password else generate_temporary_password()
        user = self.users.add(
            User(
                first_name=payload.first_name,
                last_name=payload.last_name,
                email=payload.email.lower(),
                phone_number=payload.phone_number,
                department_id=payload.department_id,
                branch_id=payload.branch_id,
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
        return user, temporary_password

    def update_user(self, user_id: int, payload: UserUpdate, actor: User) -> User:
        user = self.users.get_by_id(user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

        updates = payload.model_dump(exclude_unset=True)
        if "department_id" in updates and updates["department_id"]:
            department = self.departments.get_by_id(updates["department_id"])
            if not department or department.is_archived:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid department")

        effective_role = updates.get("role", user.role)
        effective_branch_id = updates.get("branch_id", user.branch_id)
        self._assert_can_set_role_and_branch(actor, effective_role, effective_branch_id)

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

    def get_category_ids(self, admin_id: int) -> list[int]:
        return self.category_assignments.list_category_ids(admin_id)

    def set_category_assignments(self, user_id: int, category_ids: list[int], actor: User) -> list[int]:
        user = self.users.get_by_id(user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        if user.role != UserRole.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Category assignments can only be set for branch admin accounts",
            )

        for category_id in category_ids:
            category = self.categories.get_by_id(category_id)
            if not category or category.is_archived:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid category")

        self.category_assignments.replace(user_id, category_ids, actor.id)
        self.audit.record(
            actor_user_id=actor.id,
            action="user.category_assignments_updated",
            entity_type="user",
            entity_id=str(user_id),
            metadata={"category_ids": category_ids},
        )
        self.db.commit()
        return category_ids

