from sqlalchemy.orm import Session

from app.branches.models import Branch
from app.core.reference_data import ReferenceDataRepository


def BranchRepository(db: Session) -> ReferenceDataRepository[Branch]:
    return ReferenceDataRepository(db, Branch)
