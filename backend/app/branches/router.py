from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.branches.models import Branch
from app.branches.schemas import BranchCreate, BranchRead, BranchUpdate
from app.branches.service import BranchService, _branch_usage_counts
from app.core.dependencies import get_db, require_superadmin
from app.users.models import User

router = APIRouter()


@router.get("", response_model=list[BranchRead])
def list_branches(db: Session = Depends(get_db)) -> list[Branch]:
    return BranchService(db).list_active(_branch_usage_counts(db))


@router.post("", response_model=BranchRead, status_code=status.HTTP_201_CREATED)
def create_branch(
    payload: BranchCreate,
    db: Session = Depends(get_db),
    superadmin: User = Depends(require_superadmin),
) -> Branch:
    return BranchService(db).create(payload, superadmin)


@router.patch("/{branch_id}", response_model=BranchRead)
def update_branch(
    branch_id: int,
    payload: BranchUpdate,
    db: Session = Depends(get_db),
    superadmin: User = Depends(require_superadmin),
) -> Branch:
    return BranchService(db).update(branch_id, payload, superadmin)


@router.delete("/{branch_id}")
def delete_branch(
    branch_id: int,
    db: Session = Depends(get_db),
    superadmin: User = Depends(require_superadmin),
):
    return BranchService(db).delete(branch_id, superadmin)
