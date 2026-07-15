from datetime import UTC, datetime

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.assets.models import Asset, AssetHistory, AssetStatus
from app.assets.repository import AssetRepository
from app.audit.service import AuditService
from app.borrowing.models import BorrowRequest, BorrowRequestItem, BorrowRequestStatus, BorrowTransaction
from app.borrowing.repository import BorrowingRepository
from app.borrowing.schemas import BorrowRequestCreate, BorrowRequestInspect
from app.users.models import User, UserRole

VALID_RETURN_CONDITIONS = ["Excellent", "Good", "Fair", "Damaged", "Needs Repair", "Lost"]

_CONDITION_RANKS = {
    "Excellent": 5,
    "Good": 4,
    "Fair": 3,
    "Damaged": 2,
    "Needs Repair": 1,
}


class BorrowingService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.requests = BorrowingRepository(db)
        self.assets = AssetRepository(db)
        self.audit = AuditService(db)

    def submit_request(self, payload: BorrowRequestCreate, user: User) -> BorrowRequest:
        if payload.expected_return_date.date() < datetime.now(UTC).date():
            raise HTTPException(status_code=400, detail="Expected return date cannot be in the past")

        assets: list[Asset] = []
        for asset_id in payload.asset_ids:
            asset = self.db.get(Asset, asset_id)
            if not asset or asset.status == AssetStatus.ARCHIVED:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, detail=f"Asset with ID {asset_id} not found"
                )
            if asset.status != AssetStatus.AVAILABLE:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Asset '{asset.name}' ({asset.permanent_id}) is currently {asset.status} and cannot be requested",
                )
            assets.append(asset)

        request = self.requests.add(
            BorrowRequest(
                user_id=user.id,
                status=BorrowRequestStatus.PENDING_APPROVAL,
                purpose=payload.purpose,
                expected_return_date=payload.expected_return_date,
            )
        )
        self.db.flush()

        for asset in assets:
            self.requests.add_item(BorrowRequestItem(borrow_request_id=request.id, asset_id=asset.id))

        self.audit.record(
            actor_user_id=user.id,
            action="borrow.requested",
            entity_type="borrow_request",
            entity_id=str(request.id),
            metadata={"assets_count": len(assets)},
        )
        self.db.commit()
        return self.requests.get_with_relations(request.id)

    def list_all(self, limit: int, offset: int) -> list[BorrowRequest]:
        return self.requests.list_all(limit, offset)

    def list_for_user(self, user_id: int) -> list[BorrowRequest]:
        return self.requests.list_for_user(user_id)

    def _get_or_404(self, request_id: int) -> BorrowRequest:
        request = self.requests.get_by_id(request_id)
        if not request:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Borrow request not found")
        return request

    def approve(self, request_id: int, admin: User) -> BorrowRequest:
        request = self._get_or_404(request_id)
        if request.status != BorrowRequestStatus.PENDING_APPROVAL:
            raise HTTPException(status_code=400, detail="Only pending requests can be approved")

        for item in request.items:
            asset = item.asset
            if asset.status != AssetStatus.AVAILABLE:
                raise HTTPException(status_code=400, detail=f"Asset '{asset.name}' is no longer available")
            self._transition_asset(asset, AssetStatus.RESERVED, admin, f"Reserved for Request #{request.id}")

        request.status = BorrowRequestStatus.APPROVED
        request.approved_rejected_at = datetime.now(UTC)
        request.approved_rejected_by_id = admin.id

        self.audit.record(
            actor_user_id=admin.id,
            action="borrow.approved",
            entity_type="borrow_request",
            entity_id=str(request.id),
            metadata={},
        )
        self.db.commit()
        return self.requests.get_with_relations(request.id)

    def reject(self, request_id: int, admin: User) -> BorrowRequest:
        request = self._get_or_404(request_id)
        if request.status != BorrowRequestStatus.PENDING_APPROVAL:
            raise HTTPException(status_code=400, detail="Only pending requests can be rejected")

        request.status = BorrowRequestStatus.REJECTED
        request.approved_rejected_at = datetime.now(UTC)
        request.approved_rejected_by_id = admin.id

        self.audit.record(
            actor_user_id=admin.id,
            action="borrow.rejected",
            entity_type="borrow_request",
            entity_id=str(request.id),
            metadata={},
        )
        self.db.commit()
        return self.requests.get_with_relations(request.id)

    def cancel(self, request_id: int, user: User) -> BorrowRequest:
        request = self._get_or_404(request_id)

        if user.role != UserRole.ADMIN and request.user_id != user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot cancel another staff's request")

        if request.status not in (BorrowRequestStatus.PENDING_APPROVAL, BorrowRequestStatus.APPROVED):
            raise HTTPException(
                status_code=400, detail="Cannot cancel a request that is already issued, rejected, or completed"
            )

        if request.status == BorrowRequestStatus.APPROVED:
            for item in request.items:
                asset = item.asset
                if asset.status == AssetStatus.RESERVED:
                    self._transition_asset(
                        asset, AssetStatus.AVAILABLE, user, f"Released due to cancellation of Request #{request.id}"
                    )

        request.status = BorrowRequestStatus.CANCELLED

        self.audit.record(
            actor_user_id=user.id,
            action="borrow.cancelled",
            entity_type="borrow_request",
            entity_id=str(request.id),
            metadata={},
        )
        self.db.commit()
        return self.requests.get_with_relations(request.id)

    def issue(self, request_id: int, admin: User) -> BorrowRequest:
        request = self._get_or_404(request_id)
        if request.status != BorrowRequestStatus.APPROVED:
            raise HTTPException(status_code=400, detail="Only approved requests can be issued")

        for item in request.items:
            self._transition_asset(item.asset, AssetStatus.BORROWED, admin, f"Issued for Request #{request.id}")

        request.status = BorrowRequestStatus.ISSUED

        first_asset_condition = "Good"
        if request.items:
            first_asset_condition = request.items[0].asset.condition

        self.requests.add_transaction(
            BorrowTransaction(
                borrow_request_id=request.id,
                issued_by_id=admin.id,
                issued_at=datetime.now(UTC),
                condition_out=first_asset_condition,
                notes="Asset collection scanned/approved",
            )
        )

        self.audit.record(
            actor_user_id=admin.id,
            action="borrow.issued",
            entity_type="borrow_request",
            entity_id=str(request.id),
            metadata={},
        )
        self.db.commit()
        return self.requests.get_with_relations(request.id)

    def return_assets(self, request_id: int, payload: BorrowRequestInspect, admin: User) -> BorrowRequest:
        request = self._get_or_404(request_id)
        if request.status not in (BorrowRequestStatus.ISSUED, BorrowRequestStatus.OVERDUE):
            raise HTTPException(status_code=400, detail="Only issued or overdue requests can be returned")

        if payload.return_condition not in VALID_RETURN_CONDITIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid condition. Choose from: {', '.join(VALID_RETURN_CONDITIONS)}",
            )

        for item in request.items:
            asset = item.asset
            prev_cond = asset.condition

            if payload.return_condition == "Lost":
                target_status = AssetStatus.LOST
            elif payload.return_condition in ("Damaged", "Needs Repair"):
                target_status = AssetStatus.DAMAGED
            else:
                target_status = AssetStatus.AVAILABLE

            self._transition_asset(
                asset,
                target_status,
                admin,
                f"Returned from Request #{request.id}. Condition: {payload.return_condition} (was {prev_cond})",
            )
            asset.condition = payload.return_condition

        request.status = BorrowRequestStatus.RETURNED

        transaction = self.requests.get_transaction_for_request(request.id)
        if transaction:
            transaction.received_by_id = admin.id
            transaction.returned_at = datetime.now(UTC)
            transaction.condition_in = payload.return_condition
            transaction.notes = payload.notes or transaction.notes

            out_rank = _CONDITION_RANKS.get(transaction.condition_out or "Good", 4)
            in_rank = _CONDITION_RANKS.get(payload.return_condition, 4)
            if in_rank < out_rank:
                transaction.condition_alert = True
                self.audit.record(
                    actor_user_id=admin.id,
                    action="borrow.return_alert",
                    entity_type="borrow_transaction",
                    entity_id=str(transaction.id),
                    metadata={
                        "request_id": request.id,
                        "condition_out": transaction.condition_out,
                        "condition_in": payload.return_condition,
                        "notes": "Returning condition is worse than checkout condition!",
                    },
                )

        self.audit.record(
            actor_user_id=admin.id,
            action="borrow.returned",
            entity_type="borrow_request",
            entity_id=str(request.id),
            metadata={"return_condition": payload.return_condition},
        )
        self.db.commit()
        return self.requests.get_with_relations(request.id)

    def _transition_asset(self, asset: Asset, new_status: AssetStatus, actor: User, note: str) -> None:
        previous_status = asset.status
        asset.status = new_status
        self.assets.add_history(
            AssetHistory(
                asset_id=asset.id,
                user_id=actor.id,
                action="status_change",
                previous_status=previous_status,
                new_status=new_status,
                notes=note,
            )
        )
