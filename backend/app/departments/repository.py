from sqlalchemy import select
from sqlalchemy.orm import Session

from app.departments.models import Department


class DepartmentRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_active(self) -> list[Department]:
        return list(
            self.db.scalars(
                select(Department)
                .where(Department.is_archived.is_(False))
                .order_by(Department.name.asc())
            )
        )

    def get_by_id(self, department_id: int) -> Department | None:
        return self.db.get(Department, department_id)

    def get_by_name(self, name: str) -> Department | None:
        return self.db.scalar(select(Department).where(Department.name == name))

    def add(self, department: Department) -> Department:
        self.db.add(department)
        return department

