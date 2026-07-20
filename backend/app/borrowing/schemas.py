from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from app.borrowing.models import BorrowRequestStatus
from app.assets.schemas import AssetRead
from app.branches.schemas import BranchRead
from app.users.schemas import UserRead

class BorrowRequestCreate(BaseModel):
    asset_ids: list[int] = Field(min_items=1)
    purpose: str = Field(min_length=5, max_length=500)
    expected_return_date: datetime


class BorrowRequestItemRead(BaseModel):
    id: int
    borrow_request_id: int
    asset_id: int
    asset: AssetRead

    model_config = ConfigDict(from_attributes=True)


class BorrowTransactionRead(BaseModel):
    id: int
    borrow_request_id: int
    issued_by_id: int | None
    issued_at: datetime | None
    condition_out: str | None
    received_by_id: int | None
    returned_at: datetime | None
    condition_in: str | None
    condition_alert: bool
    notes: str | None
    created_at: datetime
    updated_at: datetime

    issued_by: UserRead | None
    received_by: UserRead | None

    model_config = ConfigDict(from_attributes=True)


class BorrowRequestRead(BaseModel):
    id: int
    user_id: int
    status: BorrowRequestStatus
    purpose: str | None
    expected_return_date: datetime
    approved_rejected_at: datetime | None
    approved_rejected_by_id: int | None
    branch_id: int | None
    created_at: datetime
    updated_at: datetime

    user: UserRead
    approved_rejected_by: UserRead | None
    branch: BranchRead | None
    items: list[BorrowRequestItemRead]
    transactions: list[BorrowTransactionRead]

    model_config = ConfigDict(from_attributes=True)


class BorrowRequestInspect(BaseModel):
    return_condition: str = Field(min_length=2, max_length=500)
    notes: str | None = Field(default=None, max_length=500)
