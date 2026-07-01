from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.audit.service import AuditService
from app.core.dependencies import get_db, require_admin
from app.departments.models import Department
from app.departments.repository import DepartmentRepository
from app.departments.schemas import DepartmentCreate, DepartmentRead
from app.users.models import User

router = APIRouter()


@router.get("", response_model=list[DepartmentRead])
def list_departments(db: Session = Depends(get_db)) -> list[Department]:
    return DepartmentRepository(db).list_active()


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

