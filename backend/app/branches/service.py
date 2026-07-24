from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.assets.models import Asset
from app.assets.repository import AssetRepository
from app.branches.models import Branch
from app.core.reference_data import ReferenceDataService
from app.users.models import User, UserRole, UserStatus


def _branch_admin_counts(db: Session) -> dict[int, int]:
    return dict(
        db.execute(
            select(User.branch_id, func.count(User.id))
            .where(
                User.status != UserStatus.ARCHIVED,
                User.role == UserRole.ADMIN,
                User.branch_id.is_not(None),
            )
            .group_by(User.branch_id)
        ).all()
    )


def _branch_staff_counts(db: Session) -> dict[int, int]:
    return dict(
        db.execute(
            select(User.branch_id, func.count(User.id))
            .where(
                User.status != UserStatus.ARCHIVED,
                User.role == UserRole.STAFF,
                User.branch_id.is_not(None),
            )
            .group_by(User.branch_id)
        ).all()
    )


def _branch_asset_counts(db: Session) -> dict[int, int]:
    return AssetRepository(db).usage_counts_by(Asset.branch_id)


def _branch_usage_counts(db: Session) -> dict[int, int]:
    admin_counts = _branch_admin_counts(db)
    staff_counts = _branch_staff_counts(db)
    asset_counts = _branch_asset_counts(db)
    combined: dict[int, int] = dict(admin_counts)
    for counts in (staff_counts, asset_counts):
        for branch_id, count in counts.items():
            combined[branch_id] = combined.get(branch_id, 0) + count
    return combined


def BranchService(db: Session) -> ReferenceDataService[Branch]:
    def _usage_count(item_id: int) -> int:
        return _branch_usage_counts(db).get(item_id, 0)

    return ReferenceDataService(
        db,
        Branch,
        entity_type="branch",
        not_found_detail="Branch not found",
        create_conflict_detail="Branch already exists",
        update_conflict_detail="Another branch with this name already exists",
        create_action="branch.created",
        update_action="branch.updated",
        delete_action="branch.archived",
        delete_success_message="Branch deleted successfully",
        usage_count_fn=_usage_count,
        usage_conflict_detail="Branches with assigned admins, staff, or linked assets cannot be deleted",
    )
