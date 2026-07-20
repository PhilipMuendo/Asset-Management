from sqlalchemy import select
from sqlalchemy.orm import Session

from app.users.models import AdminCategoryAssignment, User


class UserRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_by_id(self, user_id: int) -> User | None:
        return self.db.get(User, user_id)

    def get_by_email(self, email: str) -> User | None:
        return self.db.scalar(select(User).where(User.email == email.lower()))

    def list(self, limit: int = 2000, offset: int = 0) -> list[User]:
        return list(
            self.db.scalars(
                select(User).order_by(User.created_at.desc()).limit(limit).offset(offset)
            )
        )

    def add(self, user: User) -> User:
        self.db.add(user)
        return user


class CategoryAssignmentRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_category_ids(self, admin_id: int) -> list[int]:
        return list(
            self.db.scalars(
                select(AdminCategoryAssignment.category_id).where(
                    AdminCategoryAssignment.admin_id == admin_id
                )
            )
        )

    def replace(self, admin_id: int, category_ids: list[int], assigned_by_id: int) -> None:
        self.db.query(AdminCategoryAssignment).filter(
            AdminCategoryAssignment.admin_id == admin_id
        ).delete()
        for category_id in category_ids:
            self.db.add(
                AdminCategoryAssignment(
                    admin_id=admin_id,
                    category_id=category_id,
                    assigned_by_id=assigned_by_id,
                )
            )

