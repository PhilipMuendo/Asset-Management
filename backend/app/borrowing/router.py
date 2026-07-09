from datetime import UTC, datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload
from app.audit.service import AuditService
from app.core.dependencies import get_db, require_admin, get_current_user
from app.assets.models import Asset, AssetHistory, AssetStatus
from app.assets.repository import AssetRepository
from app.borrowing.models import BorrowRequest, BorrowRequestItem, BorrowTransaction, BorrowRequestStatus
from app.borrowing.schemas import BorrowRequestCreate, BorrowRequestRead, BorrowRequestInspect
from app.users.models import User

router = APIRouter()

@router.post("/requests", response_model=BorrowRequestRead, status_code=status.HTTP_201_CREATED)
def submit_borrow_request(
    payload: BorrowRequestCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
) -> BorrowRequest:
    # Expected return date must be today or in the future
    if payload.expected_return_date.date() < datetime.now(UTC).date():
        raise HTTPException(status_code=400, detail="Expected return date cannot be in the past")

    # Ensure all assets exist and are AVAILABLE
    assets = []
    for asset_id in payload.asset_ids:
        asset = db.get(Asset, asset_id)
        if not asset or asset.status == AssetStatus.ARCHIVED:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Asset with ID {asset_id} not found")
        if asset.status != AssetStatus.AVAILABLE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_CONTENT_OR_FLOW if hasattr(status, "HTTP_400_BAD_CONTENT_OR_FLOW") else 400,
                detail=f"Asset '{asset.name}' ({asset.permanent_id}) is currently {asset.status} and cannot be requested"
            )
        assets.append(asset)

    # Create request
    request = BorrowRequest(
        user_id=user.id,
        status=BorrowRequestStatus.PENDING_APPROVAL,
        purpose=payload.purpose,
        expected_return_date=payload.expected_return_date
    )
    db.add(request)
    db.flush()

    for asset in assets:
        db.add(BorrowRequestItem(borrow_request_id=request.id, asset_id=asset.id))
        
    AuditService(db).record(
        actor_user_id=user.id,
        action="borrow.requested",
        entity_type="borrow_request",
        entity_id=str(request.id),
        metadata={"assets_count": len(assets)},
    )
    # Commit the transaction and then reload the request with its related items, user and asset relationships
    db.commit()
    # Reload the request with eager loading of user, items and their assets (including category, location, supplier)
    from sqlalchemy import select
    from sqlalchemy.orm import joinedload
    request = db.scalar(
        select(BorrowRequest)
        .where(BorrowRequest.id == request.id)
        .options(
            joinedload(BorrowRequest.user),
            joinedload(BorrowRequest.items).joinedload(BorrowRequestItem.asset).joinedload(Asset.category),
            joinedload(BorrowRequest.items).joinedload(BorrowRequestItem.asset).joinedload(Asset.location),
            joinedload(BorrowRequest.items).joinedload(BorrowRequestItem.asset).joinedload(Asset.supplier),
        )
    )
    return request


@router.get("/requests", response_model=list[BorrowRequestRead])
def list_borrow_requests(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
) -> list[BorrowRequest]:
    return list(
        db.scalars(
            select(BorrowRequest)
            .options(
                joinedload(BorrowRequest.user),
                joinedload(BorrowRequest.approved_rejected_by),
                joinedload(BorrowRequest.items).joinedload(BorrowRequestItem.asset).joinedload(Asset.category),
                joinedload(BorrowRequest.items).joinedload(BorrowRequestItem.asset).joinedload(Asset.location),
                joinedload(BorrowRequest.items).joinedload(BorrowRequestItem.asset).joinedload(Asset.supplier),
                joinedload(BorrowRequest.transactions).joinedload(BorrowTransaction.issued_by),
                joinedload(BorrowRequest.transactions).joinedload(BorrowTransaction.received_by),
            )
            .order_by(BorrowRequest.created_at.desc())
        ).unique()
    )


@router.get("/my-requests", response_model=list[BorrowRequestRead])
def list_my_borrow_requests(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
) -> list[BorrowRequest]:
    return list(
        db.scalars(
            select(BorrowRequest)
            .where(BorrowRequest.user_id == user.id)
            .options(
                joinedload(BorrowRequest.user),
                joinedload(BorrowRequest.approved_rejected_by),
                joinedload(BorrowRequest.items).joinedload(BorrowRequestItem.asset).joinedload(Asset.category),
                joinedload(BorrowRequest.items).joinedload(BorrowRequestItem.asset).joinedload(Asset.location),
                joinedload(BorrowRequest.items).joinedload(BorrowRequestItem.asset).joinedload(Asset.supplier),
                joinedload(BorrowRequest.transactions).joinedload(BorrowTransaction.issued_by),
                joinedload(BorrowRequest.transactions).joinedload(BorrowTransaction.received_by),
            )
            .order_by(BorrowRequest.created_at.desc())
        ).unique()
    )


@router.post("/requests/{request_id}/approve", response_model=BorrowRequestRead)
def approve_borrow_request(
    request_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
) -> BorrowRequest:
    request = db.get(BorrowRequest, request_id)
    if not request:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Borrow request not found")
    if request.status != BorrowRequestStatus.PENDING_APPROVAL:
        raise HTTPException(status_code=400, detail="Only pending requests can be approved")

    # Reserve the assets
    for item in request.items:
        asset = item.asset
        if asset.status != AssetStatus.AVAILABLE:
            raise HTTPException(status_code=400, detail=f"Asset '{asset.name}' is no longer available")
        asset.status = AssetStatus.RESERVED
        
        db.add(AssetHistory(
            asset_id=asset.id,
            user_id=admin.id,
            action="status_change",
            previous_status=AssetStatus.AVAILABLE,
            new_status=AssetStatus.RESERVED,
            notes=f"Reserved for Request #{request.id}"
        ))

    request.status = BorrowRequestStatus.APPROVED
    request.approved_rejected_at = datetime.now(UTC)
    request.approved_rejected_by_id = admin.id

    AuditService(db).record(
        actor_user_id=admin.id,
        action="borrow.approved",
        entity_type="borrow_request",
        entity_id=str(request.id),
        metadata={},
    )
    db.commit()
    db.refresh(request)
    return request


@router.post("/requests/{request_id}/reject", response_model=BorrowRequestRead)
def reject_borrow_request(
    request_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
) -> BorrowRequest:
    request = db.get(BorrowRequest, request_id)
    if not request:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Borrow request not found")
    if request.status != BorrowRequestStatus.PENDING_APPROVAL:
        raise HTTPException(status_code=400, detail="Only pending requests can be rejected")

    request.status = BorrowRequestStatus.REJECTED
    request.approved_rejected_at = datetime.now(UTC)
    request.approved_rejected_by_id = admin.id

    AuditService(db).record(
        actor_user_id=admin.id,
        action="borrow.rejected",
        entity_type="borrow_request",
        entity_id=str(request.id),
        metadata={},
    )
    db.commit()
    db.refresh(request)
    return request


@router.post("/requests/{request_id}/cancel", response_model=BorrowRequestRead)
def cancel_borrow_request(
    request_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
) -> BorrowRequest:
    request = db.get(BorrowRequest, request_id)
    if not request:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Borrow request not found")
    
    # Staff can only cancel their own, admins can cancel any
    if user.role != "admin" and request.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot cancel another staff's request")

    if request.status not in (BorrowRequestStatus.PENDING_APPROVAL, BorrowRequestStatus.APPROVED):
        raise HTTPException(status_code=400, detail="Cannot cancel a request that is already issued, rejected, or completed")

    # Release reserved assets if previously approved
    if request.status == BorrowRequestStatus.APPROVED:
        for item in request.items:
            asset = item.asset
            if asset.status == AssetStatus.RESERVED:
                asset.status = AssetStatus.AVAILABLE
                db.add(AssetHistory(
                    asset_id=asset.id,
                    user_id=user.id,
                    action="status_change",
                    previous_status=AssetStatus.RESERVED,
                    new_status=AssetStatus.AVAILABLE,
                    notes=f"Released due to cancellation of Request #{request.id}"
                ))

    request.status = BorrowRequestStatus.CANCELLED

    AuditService(db).record(
        actor_user_id=user.id,
        action="borrow.cancelled",
        entity_type="borrow_request",
        entity_id=str(request.id),
        metadata={},
    )
    db.commit()
    db.refresh(request)
    return request


@router.post("/requests/{request_id}/issue", response_model=BorrowRequestRead)
def issue_assets(
    request_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
) -> BorrowRequest:
    request = db.get(BorrowRequest, request_id)
    if not request:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Borrow request not found")
    if request.status != BorrowRequestStatus.APPROVED:
        raise HTTPException(status_code=400, detail="Only approved requests can be issued")

    # Transition reserved assets to BORROWED
    for item in request.items:
        asset = item.asset
        asset.status = AssetStatus.BORROWED
        db.add(AssetHistory(
            asset_id=asset.id,
            user_id=admin.id,
            action="status_change",
            previous_status=AssetStatus.RESERVED,
            new_status=AssetStatus.BORROWED,
            notes=f"Issued for Request #{request.id}"
        ))

    request.status = BorrowRequestStatus.ISSUED

    # Get condition of the first asset requested (or default to Good)
    first_asset_condition = "Good"
    if request.items:
        first_asset_condition = request.items[0].asset.condition

    transaction = BorrowTransaction(
        borrow_request_id=request.id,
        issued_by_id=admin.id,
        issued_at=datetime.now(UTC),
        condition_out=first_asset_condition,
        notes="Asset collection scanned/approved"
    )
    db.add(transaction)

    AuditService(db).record(
        actor_user_id=admin.id,
        action="borrow.issued",
        entity_type="borrow_request",
        entity_id=str(request.id),
        metadata={},
    )
    db.commit()
    db.refresh(request)
    return request


@router.post("/requests/{request_id}/return", response_model=BorrowRequestRead)
def return_assets(
    request_id: int,
    payload: BorrowRequestInspect,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
) -> BorrowRequest:
    request = db.get(BorrowRequest, request_id)
    if not request:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Borrow request not found")
    if request.status not in (BorrowRequestStatus.ISSUED, BorrowRequestStatus.OVERDUE):
        raise HTTPException(status_code=400, detail="Only issued or overdue requests can be returned")

    # Validate condition value from master list
    valid_conditions = ["Excellent", "Good", "Fair", "Damaged", "Needs Repair", "Lost"]
    if payload.return_condition not in valid_conditions:
        raise HTTPException(status_code=400, detail=f"Invalid condition. Choose from: {', '.join(valid_conditions)}")

    # Transition assets based on return condition
    for item in request.items:
        asset = item.asset
        prev = asset.status
        prev_cond = asset.condition
        
        if payload.return_condition == "Lost":
            target_status = AssetStatus.LOST
        elif payload.return_condition in ("Damaged", "Needs Repair"):
            target_status = AssetStatus.DAMAGED
        else:
            target_status = AssetStatus.AVAILABLE

        asset.status = target_status
        asset.condition = payload.return_condition  # Update asset's current condition
        db.add(AssetHistory(
            asset_id=asset.id,
            user_id=admin.id,
            action="status_change",
            previous_status=prev,
            new_status=target_status,
            notes=f"Returned from Request #{request.id}. Condition: {payload.return_condition} (was {prev_cond})"
        ))

    request.status = BorrowRequestStatus.RETURNED

    # Find the transaction and update it
    transaction = db.scalar(
        select(BorrowTransaction).where(BorrowTransaction.borrow_request_id == request.id)
    )
    if transaction:
        transaction.received_by_id = admin.id
        transaction.returned_at = datetime.now(UTC)
        transaction.condition_in = payload.return_condition
        transaction.notes = payload.notes or transaction.notes
        
        # Check if condition in is worse than condition out
        CONDITION_RANKS = {
            "Excellent": 5,
            "Good": 4,
            "Fair": 3,
            "Damaged": 2,
            "Needs Repair": 1
        }
        out_rank = CONDITION_RANKS.get(transaction.condition_out or "Good", 4)
        in_rank = CONDITION_RANKS.get(payload.return_condition, 4)
        if in_rank < out_rank:
            transaction.condition_alert = True
            
            # Notify Admin / Audit alert
            AuditService(db).record(
                actor_user_id=admin.id,
                action="borrow.return_alert",
                entity_type="borrow_transaction",
                entity_id=str(transaction.id),
                metadata={
                    "request_id": request.id,
                    "condition_out": transaction.condition_out,
                    "condition_in": payload.return_condition,
                    "notes": "Returning condition is worse than checkout condition!"
                },
            )

    AuditService(db).record(
        actor_user_id=admin.id,
        action="borrow.returned",
        entity_type="borrow_request",
        entity_id=str(request.id),
        metadata={"return_condition": payload.return_condition},
    )
    db.commit()
    db.refresh(request)
    return request
