from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.branches.models import Branch
from app.branches.schemas import BranchCreate, BranchRead, BranchUpdate
from app.branches.service import (
    BranchService,
    _branch_admin_counts,
    _branch_asset_counts,
    _branch_staff_counts,
    _branch_usage_counts,
)
from app.core.dependencies import get_db, require_superadmin
from app.users.models import User

router = APIRouter()


@router.get("", response_model=list[BranchRead])
def list_branches(db: Session = Depends(get_db)) -> list[Branch]:
    admin_counts = _branch_admin_counts(db)
    staff_counts = _branch_staff_counts(db)
    asset_counts = _branch_asset_counts(db)
    usage_counts = {
        branch_id: admin_counts.get(branch_id, 0) + staff_counts.get(branch_id, 0) + asset_counts.get(branch_id, 0)
        for branch_id in set(admin_counts) | set(staff_counts) | set(asset_counts)
    }
    branches = BranchService(db).list_active(usage_counts)
    for branch in branches:
        branch.admin_count = admin_counts.get(branch.id, 0)
        branch.staff_count = staff_counts.get(branch.id, 0)
        branch.asset_count = asset_counts.get(branch.id, 0)
    return branches


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
