from sqlalchemy.orm import Session

from app.core.reference_data import ReferenceDataRepository
from app.departments.models import Department


def DepartmentRepository(db: Session) -> ReferenceDataRepository[Department]:
    return ReferenceDataRepository(db, Department)

