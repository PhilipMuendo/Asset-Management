from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field

class DepartmentCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    description: str | None = Field(default=None, max_length=500)

class DepartmentRead(BaseModel):
    id: int
    name: str
    description: str | None
    is_archived: bool
    usage_count: int | None = Field(default=0)
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class DepartmentUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    description: str | None = Field(default=None, max_length=500)
