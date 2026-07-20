from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload, selectinload

from app.assets.models import Asset
from app.borrowing.models import BorrowRequest, BorrowRequestItem, BorrowTransaction


def borrow_request_load_options():
    """Eager-load options shared by every borrow request read query.

    Uses selectinload for the to-many relations (items, transactions) so that
    combining these queries with LIMIT/OFFSET doesn't fan out rows before the
    limit is applied (a correctness bug joinedload has on collections).
    """
    return (
        joinedload(BorrowRequest.user),
        joinedload(BorrowRequest.approved_rejected_by),
        joinedload(BorrowRequest.branch),
        selectinload(BorrowRequest.items).joinedload(BorrowRequestItem.asset).joinedload(Asset.category),
        selectinload(BorrowRequest.items).joinedload(BorrowRequestItem.asset).joinedload(Asset.location),
        selectinload(BorrowRequest.items).joinedload(BorrowRequestItem.asset).joinedload(Asset.supplier),
        selectinload(BorrowRequest.transactions).joinedload(BorrowTransaction.issued_by),
        selectinload(BorrowRequest.transactions).joinedload(BorrowTransaction.received_by),
    )


class BorrowingRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_by_id(self, request_id: int) -> BorrowRequest | None:
        return self.db.get(BorrowRequest, request_id)

    def get_with_relations(self, request_id: int) -> BorrowRequest | None:
        return self.db.scalar(
            select(BorrowRequest)
            .where(BorrowRequest.id == request_id)
            .options(*borrow_request_load_options())
        )

    def list_all(self, limit: int, offset: int) -> list[BorrowRequest]:
        return list(
            self.db.scalars(
                select(BorrowRequest)
                .options(*borrow_request_load_options())
                .order_by(BorrowRequest.created_at.desc())
                .limit(limit)
                .offset(offset)
            ).unique()
        )

    def list_for_branch(self, branch_id: int, limit: int, offset: int) -> list[BorrowRequest]:
        return list(
            self.db.scalars(
                select(BorrowRequest)
                .where(BorrowRequest.branch_id == branch_id)
                .options(*borrow_request_load_options())
                .order_by(BorrowRequest.created_at.desc())
                .limit(limit)
                .offset(offset)
            ).unique()
        )

    def list_for_user(self, user_id: int) -> list[BorrowRequest]:
        return list(
            self.db.scalars(
                select(BorrowRequest)
                .where(BorrowRequest.user_id == user_id)
                .options(*borrow_request_load_options())
                .order_by(BorrowRequest.created_at.desc())
            ).unique()
        )

    def add(self, request: BorrowRequest) -> BorrowRequest:
        self.db.add(request)
        return request

    def add_item(self, item: BorrowRequestItem) -> BorrowRequestItem:
        self.db.add(item)
        return item

    def add_transaction(self, transaction: BorrowTransaction) -> BorrowTransaction:
        self.db.add(transaction)
        return transaction

    def get_transaction_for_request(self, request_id: int) -> BorrowTransaction | None:
        return self.db.scalar(
            select(BorrowTransaction).where(BorrowTransaction.borrow_request_id == request_id)
        )
