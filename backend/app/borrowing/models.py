from __future__ import annotations
from datetime import datetime
from enum import StrEnum
from typing import TYPE_CHECKING
from sqlalchemy import ForeignKey, String, Enum, Text, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base
from app.database.mixins import TimestampMixin

if TYPE_CHECKING:
    from app.users.models import User
    from app.assets.models import Asset

class BorrowRequestStatus(StrEnum):
    PENDING_APPROVAL = "pending_approval"
    APPROVED = "approved"
    REJECTED = "rejected"
    ISSUED = "issued"
    RETURNED = "returned"
    OVERDUE = "overdue"
    CANCELLED = "cancelled"


class BorrowRequest(TimestampMixin, Base):
    __tablename__ = "borrow_requests"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    status: Mapped[BorrowRequestStatus] = mapped_column(
        Enum(BorrowRequestStatus, name="borrow_request_status", values_callable=lambda enum: [item.value for item in enum]),
        default=BorrowRequestStatus.PENDING_APPROVAL,
        index=True
    )
    purpose: Mapped[str | None] = mapped_column(Text)
    expected_return_date: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    
    approved_rejected_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    approved_rejected_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    user: Mapped[User] = relationship(foreign_keys=[user_id])
    approved_rejected_by: Mapped[User | None] = relationship(foreign_keys=[approved_rejected_by_id])
    
    items: Mapped[list[BorrowRequestItem]] = relationship(back_populates="borrow_request", cascade="all, delete-orphan")
    transactions: Mapped[list[BorrowTransaction]] = relationship(back_populates="borrow_request", cascade="all, delete-orphan")


class BorrowRequestItem(Base):
    __tablename__ = "borrow_request_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    borrow_request_id: Mapped[int] = mapped_column(ForeignKey("borrow_requests.id", ondelete="CASCADE"))
    asset_id: Mapped[int] = mapped_column(ForeignKey("assets.id", ondelete="CASCADE"))

    borrow_request: Mapped[BorrowRequest] = relationship(back_populates="items")
    asset: Mapped[Asset] = relationship()


class BorrowTransaction(TimestampMixin, Base):
    __tablename__ = "borrow_transactions"

    id: Mapped[int] = mapped_column(primary_key=True)
    borrow_request_id: Mapped[int] = mapped_column(ForeignKey("borrow_requests.id", ondelete="CASCADE"))
    
    issued_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    issued_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    initial_condition: Mapped[str | None] = mapped_column(Text)
    
    received_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    returned_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    return_condition: Mapped[str | None] = mapped_column(Text)
    
    notes: Mapped[str | None] = mapped_column(Text)

    borrow_request: Mapped[BorrowRequest] = relationship(back_populates="transactions")
    issued_by: Mapped[User | None] = relationship(foreign_keys=[issued_by_id])
    received_by: Mapped[User | None] = relationship(foreign_keys=[received_by_id])
