from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.users.models import UserRole, UserStatus


class UserBase(BaseModel):
    first_name: str = Field(min_length=2, max_length=80)
    last_name: str = Field(min_length=2, max_length=80)
    email: EmailStr
    phone_number: str = Field(min_length=7, max_length=40)
    department_id: int | None = None
    job_title: str | None = Field(default=None, max_length=120)
    role: UserRole
    status: UserStatus = UserStatus.ACTIVE

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.lower()


class UserCreate(UserBase):
    """Payload for admin-created accounts."""


class UserUpdate(BaseModel):
    first_name: str | None = Field(default=None, min_length=2, max_length=80)
    last_name: str | None = Field(default=None, min_length=2, max_length=80)
    phone_number: str | None = Field(default=None, min_length=7, max_length=40)
    department_id: int | None = None
    job_title: str | None = Field(default=None, max_length=120)
    role: UserRole | None = None
    status: UserStatus | None = None


class UserRead(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: EmailStr
    phone_number: str
    department_id: int | None
    job_title: str | None
    role: UserRole
    status: UserStatus
    must_change_password: bool
    last_login_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
