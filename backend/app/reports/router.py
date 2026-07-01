from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.orm import Session, joinedload
from app.core.dependencies import get_db, require_admin
from app.assets.models import Asset, AssetCategory, AssetStatus, Location, Supplier
from app.borrowing.models import BorrowRequest, BorrowRequestStatus
from app.users.models import User
from app.departments.models import Department
from app.audit.models import AuditLog
from typing import Any

router = APIRouter()

@router.get("/dashboard", response_model=dict[str, Any])
def get_dashboard_summary(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
) -> dict[str, Any]:
    # Counts
    total_assets = db.scalar(select(func.count(Asset.id)).where(Asset.status != AssetStatus.ARCHIVED)) or 0
    total_users = db.scalar(select(func.count(User.id)).where(User.status != "archived")) or 0
    total_departments = db.scalar(select(func.count(Department.id)).where(Department.is_archived.is_(False))) or 0
    total_categories = db.scalar(select(func.count(AssetCategory.id)).where(AssetCategory.is_archived.is_(False))) or 0
    
    active_borrows = db.scalar(
        select(func.count(BorrowRequest.id)).where(BorrowRequest.status == BorrowRequestStatus.ISSUED)
    ) or 0

    overdue_borrows = db.scalar(
        select(func.count(BorrowRequest.id))
        .where(
            BorrowRequest.status == BorrowRequestStatus.ISSUED,
            BorrowRequest.expected_return_date < func.now()
        )
    ) or 0

    # Group by status
    status_counts_raw = db.execute(
        select(Asset.status, func.count(Asset.id))
        .where(Asset.status != AssetStatus.ARCHIVED)
        .group_by(Asset.status)
    ).all()
    
    status_counts = {status.value: count for status, count in status_counts_raw}

    # Ensure all statuses have a value
    for s in AssetStatus:
        if s.value != "archived" and s.value not in status_counts:
            status_counts[s.value] = 0

    # Recent Audit Logs
    recent_logs = list(
        db.scalars(
            select(AuditLog)
            .order_by(AuditLog.created_at.desc())
            .limit(20)
        )
    )
    
    recent_logs_serialized = []
    for log in recent_logs:
        actor = db.get(User, log.actor_user_id) if log.actor_user_id else None
        recent_logs_serialized.append({
            "id": log.id,
            "actor_name": actor.full_name if actor else "System",
            "actor_email": actor.email if actor else None,
            "action": log.action,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "metadata": log.metadata_,
            "created_at": log.created_at
        })

    return {
        "metrics": {
            "total_assets": total_assets,
            "total_users": total_users,
            "total_departments": total_departments,
            "total_categories": total_categories,
            "active_borrows": active_borrows,
            "overdue_borrows": overdue_borrows
        },
        "status_distribution": status_counts,
        "recent_audit_logs": recent_logs_serialized
    }


@router.get("/audit-logs", response_model=list[dict[str, Any]])
def get_all_audit_logs(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
) -> list[dict[str, Any]]:
    logs = list(
        db.scalars(
            select(AuditLog)
            .order_by(AuditLog.created_at.desc())
        )
    )
    serialized = []
    for log in logs:
        actor = db.get(User, log.actor_user_id) if log.actor_user_id else None
        serialized.append({
            "id": log.id,
            "actor_name": actor.full_name if actor else "System",
            "actor_email": actor.email if actor else None,
            "action": log.action,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "metadata": log.metadata_,
            "created_at": log.created_at
        })
    return serialized
