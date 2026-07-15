from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, require_admin
from app.departments.models import Department
from app.departments.schemas import DepartmentCreate, DepartmentRead, DepartmentUpdate
from app.departments.service import DepartmentService, _department_usage_counts
from app.users.models import User

router = APIRouter()


@router.get("", response_model=list[DepartmentRead])
def list_departments(db: Session = Depends(get_db)) -> list[Department]:
    return DepartmentService(db).list_active(_department_usage_counts(db))


@router.post("", response_model=DepartmentRead, status_code=status.HTTP_201_CREATED)
def create_department(
    payload: DepartmentCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> Department:
    return DepartmentService(db).create(payload, admin)


@router.patch("/{department_id}", response_model=DepartmentRead)
def update_department(
    department_id: int,
    payload: DepartmentUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> Department:
    return DepartmentService(db).update(department_id, payload, admin)


@router.delete("/{department_id}")
def delete_department(
    department_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    return DepartmentService(db).delete(department_id, admin)
