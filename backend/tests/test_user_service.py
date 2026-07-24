import sys
from pathlib import Path

# Ensure the project root is in sys.path for imports
project_root = Path(__file__).resolve().parents[2]
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from fastapi import HTTPException

from app.database.base import Base
from app.branches.models import Branch
from app.core.security import hash_password, verify_password
from app.users.models import User, UserRole, UserStatus
from app.users.schemas import UserCreate, UserUpdate
from app.users.service import UserService
from app.utils.email import EmailClient


@pytest.fixture
def db_session():
    """Create an in‑memory SQLite session for tests."""
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine)
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def test_create_user_returns_temporary_password(db_session):
    # Arrange: a branch, and an admin actor assigned to it
    branch = Branch(name="Nairobi", code="NBO", country="Kenya")
    db_session.add(branch)
    db_session.commit()
    db_session.refresh(branch)

    admin = User(
        first_name="Admin",
        last_name="User",
        email="admin@example.com",
        phone_number="111111111",
        department_id=None,
        branch_id=branch.id,
        job_title="Administrator",
        role=UserRole.ADMIN,
        status=UserStatus.ACTIVE,
        password_hash=hash_password("adminpass"),
        must_change_password=False,
    )
    db_session.add(admin)
    db_session.commit()
    db_session.refresh(admin)

    # Payload without explicit password – service should generate one
    payload = UserCreate(
        first_name="John",
        last_name="Doe",
        email="john@example.com",
        phone_number="123456789",
        department_id=None,
        branch_id=branch.id,
        job_title="Engineer",
        role=UserRole.STAFF,
        status=UserStatus.ACTIVE,
        password=None,
    )

    # Monkey‑patch email sending to avoid side effects
    EmailClient.send_welcome_email = lambda self, message: None

    service = UserService(db_session)
    user, temporary_password = service.create_user(payload, admin)

    # Assert: temporary password is returned and stored correctly
    assert isinstance(temporary_password, str)
    assert len(temporary_password) >= 8
    assert user.email == payload.email.lower()
    assert verify_password(temporary_password, user.password_hash)


def _make_branch(db_session, name="Nairobi", code="NBO"):
    branch = Branch(name=name, code=code, country="Kenya")
    db_session.add(branch)
    db_session.commit()
    db_session.refresh(branch)
    return branch


def _make_user(db_session, *, role, branch_id=None, email):
    user = User(
        first_name="Test",
        last_name="User",
        email=email,
        phone_number="123456789",
        department_id=None,
        branch_id=branch_id,
        job_title=None,
        role=role,
        status=UserStatus.ACTIVE,
        password_hash=hash_password("password123"),
        must_change_password=False,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def test_branch_admin_cannot_create_staff_for_another_branch(db_session):
    home_branch = _make_branch(db_session, name="Nairobi", code="NBO")
    other_branch = _make_branch(db_session, name="Mombasa", code="MSA")
    admin = _make_user(db_session, role=UserRole.ADMIN, branch_id=home_branch.id, email="admin@example.com")

    payload = UserCreate(
        first_name="Jane",
        last_name="Doe",
        email="jane@example.com",
        phone_number="123456789",
        department_id=None,
        branch_id=other_branch.id,
        job_title=None,
        role=UserRole.STAFF,
        status=UserStatus.ACTIVE,
        password=None,
    )

    EmailClient.send_welcome_email = lambda self, message: None
    service = UserService(db_session)
    with pytest.raises(HTTPException) as exc_info:
        service.create_user(payload, admin)
    assert exc_info.value.status_code == 403


def test_branch_admin_can_edit_own_staff(db_session):
    branch = _make_branch(db_session)
    admin = _make_user(db_session, role=UserRole.ADMIN, branch_id=branch.id, email="admin@example.com")
    staff = _make_user(db_session, role=UserRole.STAFF, branch_id=branch.id, email="staff@example.com")

    service = UserService(db_session)
    updated = service.update_user(staff.id, UserUpdate(job_title="Technician"), admin)
    assert updated.job_title == "Technician"


def test_branch_admin_cannot_edit_staff_at_another_branch(db_session):
    home_branch = _make_branch(db_session, name="Nairobi", code="NBO")
    other_branch = _make_branch(db_session, name="Mombasa", code="MSA")
    admin = _make_user(db_session, role=UserRole.ADMIN, branch_id=home_branch.id, email="admin@example.com")
    staff = _make_user(db_session, role=UserRole.STAFF, branch_id=other_branch.id, email="staff@example.com")

    service = UserService(db_session)
    with pytest.raises(HTTPException) as exc_info:
        service.update_user(staff.id, UserUpdate(job_title="Technician"), admin)
    assert exc_info.value.status_code == 403


def test_branch_admin_cannot_edit_another_admin(db_session):
    branch = _make_branch(db_session)
    admin = _make_user(db_session, role=UserRole.ADMIN, branch_id=branch.id, email="admin@example.com")
    other_admin = _make_user(db_session, role=UserRole.ADMIN, branch_id=branch.id, email="other-admin@example.com")

    service = UserService(db_session)
    with pytest.raises(HTTPException) as exc_info:
        service.update_user(other_admin.id, UserUpdate(job_title="Technician"), admin)
    assert exc_info.value.status_code == 403


def test_superadmin_can_edit_any_user(db_session):
    branch = _make_branch(db_session)
    superadmin = _make_user(db_session, role=UserRole.SUPERADMIN, branch_id=None, email="super@example.com")
    staff = _make_user(db_session, role=UserRole.STAFF, branch_id=branch.id, email="staff@example.com")

    service = UserService(db_session)
    updated = service.update_user(staff.id, UserUpdate(job_title="Lead Technician"), superadmin)
    assert updated.job_title == "Lead Technician"
