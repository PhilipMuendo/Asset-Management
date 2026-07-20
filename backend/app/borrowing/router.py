from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.borrowing.models import BorrowRequest
from app.borrowing.schemas import BorrowRequestCreate, BorrowRequestRead, BorrowRequestInspect
from app.borrowing.service import BorrowingService
from app.core.dependencies import get_db, require_admin, get_current_user
from app.users.models import User

router = APIRouter()


@router.post("/requests", response_model=BorrowRequestRead, status_code=status.HTTP_201_CREATED)
def submit_borrow_request(
    payload: BorrowRequestCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> BorrowRequest:
    return BorrowingService(db).submit_request(payload, user)


@router.get("/requests", response_model=list[BorrowRequestRead])
def list_borrow_requests(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
    limit: int = Query(2000, ge=1, le=5000),
    offset: int = Query(0, ge=0),
) -> list[BorrowRequest]:
    return BorrowingService(db).list_all(admin, limit=limit, offset=offset)


@router.get("/my-requests", response_model=list[BorrowRequestRead])
def list_my_borrow_requests(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[BorrowRequest]:
    return BorrowingService(db).list_for_user(user.id)


@router.post("/requests/{request_id}/approve", response_model=BorrowRequestRead)
def approve_borrow_request(
    request_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> BorrowRequest:
    return BorrowingService(db).approve(request_id, admin)


@router.post("/requests/{request_id}/reject", response_model=BorrowRequestRead)
def reject_borrow_request(
    request_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> BorrowRequest:
    return BorrowingService(db).reject(request_id, admin)


@router.post("/requests/{request_id}/cancel", response_model=BorrowRequestRead)
def cancel_borrow_request(
    request_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> BorrowRequest:
    return BorrowingService(db).cancel(request_id, user)


@router.post("/requests/{request_id}/issue", response_model=BorrowRequestRead)
def issue_assets(
    request_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> BorrowRequest:
    return BorrowingService(db).issue(request_id, admin)


@router.post("/requests/{request_id}/return", response_model=BorrowRequestRead)
def return_assets(
    request_id: int,
    payload: BorrowRequestInspect,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> BorrowRequest:
    return BorrowingService(db).return_assets(request_id, payload, admin)
