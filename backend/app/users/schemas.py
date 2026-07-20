from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

from app.users.models import UserRole, UserStatus


class UserBase(BaseModel):
    first_name: str = Field(min_length=2, max_length=80)
    last_name: str = Field(min_length=2, max_length=80)
    email: EmailStr
    phone_number: str = Field(min_length=7, max_length=40)
    department_id: int | None = None
    branch_id: int | None = None
    job_title: str | None = Field(default=None, max_length=120)
    role: UserRole
    status: UserStatus = UserStatus.ACTIVE

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.lower()


class UserCreate(UserBase):
    """Payload for admin-created accounts."""

    password: str | None = Field(default=None, min_length=8, max_length=128)

    @model_validator(mode="after")
    def validate_branch_for_role(self) -> "UserCreate":
        if self.role == UserRole.ADMIN and self.branch_id is None:
            raise ValueError("A branch must be assigned to a branch admin account")
        if self.role != UserRole.ADMIN and self.branch_id is not None:
            raise ValueError("branch_id can only be set for branch admin accounts")
        return self


class UserUpdate(BaseModel):
    first_name: str | None = Field(default=None, min_length=2, max_length=80)
    last_name: str | None = Field(default=None, min_length=2, max_length=80)
    phone_number: str | None = Field(default=None, min_length=7, max_length=40)
    department_id: int | None = None
    branch_id: int | None = None
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
    branch_id: int | None
    job_title: str | None
    role: UserRole
    status: UserStatus
    must_change_password: bool
    last_login_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserCreateResponse(UserRead):
    """Response for admin-created accounts — includes the one-time temporary password."""

    temporary_password: str | None = None


class CurrentUserRead(UserRead):
    """Extends UserRead with session-scoped RBAC data, used only for the authenticated caller."""

    category_ids: list[int] = Field(default_factory=list)
    session_branch_id: int | None = None


class CategoryAssignmentUpdate(BaseModel):
    category_ids: list[int] = Field(default_factory=list)
