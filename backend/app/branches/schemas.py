from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class BranchCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    code: str = Field(min_length=2, max_length=10)
    country: str = Field(min_length=2, max_length=80)
    address: str | None = Field(default=None, max_length=500)
    is_active: bool | None = Field(default=True)


class BranchRead(BaseModel):
    id: int
    name: str
    code: str
    country: str
    address: str | None
    is_archived: bool
    is_active: bool
    usage_count: int | None = Field(default=0)
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class BranchUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    code: str | None = Field(default=None, min_length=2, max_length=10)
    country: str | None = Field(default=None, min_length=2, max_length=80)
    address: str | None = Field(default=None, max_length=500)
    is_active: bool | None = Field(default=None)
