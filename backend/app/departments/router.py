from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.audit.service import AuditService
from app.core.dependencies import get_db, require_admin
from app.departments.models import Department
from app.departments.repository import DepartmentRepository
from app.departments.schemas import DepartmentCreate, DepartmentRead, DepartmentUpdate
from app.users.models import User

router = APIRouter()


@router.get("", response_model=list[DepartmentRead])
def list_departments(db: Session = Depends(get_db)) -> list[Department]:
    items = DepartmentRepository(db).list_active()
    for item in items:
        item.usage_count = db.scalar(
            select(func.count(User.id)).where(User.department_id == item.id, User.status != "archived")
        ) or 0
    return items


@router.post("", response_model=DepartmentRead, status_code=status.HTTP_201_CREATED)
def create_department(
    payload: DepartmentCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> Department:
    repo = DepartmentRepository(db)
    existing = repo.get_by_name(payload.name)
    if existing and not existing.is_archived:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Department already exists")

    department = repo.add(Department(name=payload.name, description=payload.description))
    db.flush()
    AuditService(db).record(
        actor_user_id=admin.id,
        action="department.created",
        entity_type="department",
        entity_id=str(department.id),
        metadata={"name": department.name},
    )
    db.commit()
    db.refresh(department)
    return department


@router.patch("/{department_id}", response_model=DepartmentRead)
def update_department(
    department_id: int,
    payload: DepartmentUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> Department:
    repo = DepartmentRepository(db)
    department = repo.get_by_id(department_id)
    if not department or department.is_archived:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")

    if payload.name:
        existing = repo.get_by_name(payload.name)
        if existing and existing.id != department_id and not existing.is_archived:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Another department with this name already exists")

    for field, val in payload.model_dump(exclude_unset=True).items():
        setattr(department, field, val)

    AuditService(db).record(
        actor_user_id=admin.id,
        action="department.renamed",
        entity_type="department",
        entity_id=str(department.id),
        metadata={"name": department.name},
    )
    db.commit()
    db.refresh(department)
    return department


@router.delete("/{department_id}")
def delete_department(
    department_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    repo = DepartmentRepository(db)
    department = repo.get_by_id(department_id)
    if not department or department.is_archived:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")

    usage_count = db.scalar(
        select(func.count(User.id)).where(User.department_id == department_id, User.status != "archived")
    ) or 0
    if usage_count > 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Departments with linked users cannot be deleted")

    department.is_archived = True
    AuditService(db).record(
        actor_user_id=admin.id,
        action="department.archived",
        entity_type="department",
        entity_id=str(department.id),
        metadata={"name": department.name},
    )
    db.commit()
    return {"message": "Department deleted successfully"}

