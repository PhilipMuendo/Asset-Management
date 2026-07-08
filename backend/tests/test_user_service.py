import sys
from pathlib import Path

# Ensure the project root is in sys.path for imports
project_root = Path(__file__).resolve().parents[2]
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database.base import Base
from app.core.security import hash_password, verify_password
from app.users.models import User, UserRole, UserStatus
from app.users.schemas import UserCreate
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
    # Arrange: create an admin actor
    admin = User(
        first_name="Admin",
        last_name="User",
        email="admin@example.com",
        phone_number="111111111",
        department_id=None,
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
