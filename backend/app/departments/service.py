from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.reference_data import ReferenceDataService
from app.departments.models import Department
from app.users.models import User, UserStatus


def _department_usage_counts(db: Session) -> dict[int, int]:
    return dict(
        db.execute(
            select(User.department_id, func.count(User.id))
            .where(User.status != UserStatus.ARCHIVED, User.department_id.is_not(None))
            .group_by(User.department_id)
        ).all()
    )


def DepartmentService(db: Session) -> ReferenceDataService[Department]:
    def _usage_count(item_id: int) -> int:
        return _department_usage_counts(db).get(item_id, 0)

    return ReferenceDataService(
        db,
        Department,
        entity_type="department",
        not_found_detail="Department not found",
        create_conflict_detail="Department already exists",
        update_conflict_detail="Another department with this name already exists",
        create_action="department.created",
        update_action="department.renamed",
        delete_action="department.archived",
        delete_success_message="Department deleted successfully",
        usage_count_fn=_usage_count,
        usage_conflict_detail="Departments with linked users cannot be deleted",
    )
