from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from app.assets.models import AssetStatus

# Category
class CategoryCreate(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    description: str | None = Field(default=None, max_length=500)
    is_active: bool | None = Field(default=True)

class CategoryRead(BaseModel):
    id: int
    name: str
    description: str | None
    is_archived: bool
    is_active: bool
    usage_count: int | None = Field(default=0)
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Location
class LocationCreate(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    description: str | None = Field(default=None, max_length=500)
    is_active: bool | None = Field(default=True)

class LocationRead(BaseModel):
    id: int
    name: str
    description: str | None
    is_archived: bool
    is_active: bool
    usage_count: int | None = Field(default=0)
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Supplier
class SupplierCreate(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    contact_info: str | None = Field(default=None)
    is_active: bool | None = Field(default=True)

class SupplierRead(BaseModel):
    id: int
    name: str
    contact_info: str | None
    is_archived: bool
    is_active: bool
    usage_count: int | None = Field(default=0)
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Asset History
class AssetHistoryRead(BaseModel):
    id: int
    asset_id: int
    user_id: int | None
    action: str
    previous_status: str | None
    new_status: str | None
    notes: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Asset
class AssetCreate(BaseModel):
    permanent_id: str = Field(min_length=3, max_length=40)
    name: str = Field(min_length=2, max_length=120)
    serial_number: str | None = Field(default=None, max_length=100)
    model_number: str | None = Field(default=None, max_length=100)
    description: str | None = Field(default=None)
    category_id: int
    location_id: int
    supplier_id: int | None = Field(default=None)

    purchase_date: datetime | None = Field(default=None)
    purchase_cost: float | None = Field(default=None)
    invoice_number: str | None = Field(default=None, max_length=100)
    warranty_expiry: datetime | None = Field(default=None)
    purchase_notes: str | None = Field(default=None)
    photos: list[str] | None = Field(default_factory=list)
    notes: str | None = Field(default=None)
    condition: str | None = Field(default="Good")

class AssetUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    serial_number: str | None = Field(default=None, max_length=100)
    model_number: str | None = Field(default=None, max_length=100)
    description: str | None = Field(default=None)
    status: AssetStatus | None = Field(default=None)
    category_id: int | None = Field(default=None)
    location_id: int | None = Field(default=None)
    supplier_id: int | None = Field(default=None)

    purchase_date: datetime | None = Field(default=None)
    purchase_cost: float | None = Field(default=None)
    invoice_number: str | None = Field(default=None, max_length=100)
    warranty_expiry: datetime | None = Field(default=None)
    purchase_notes: str | None = Field(default=None)
    photos: list[str] | None = Field(default=None)
    notes: str | None = Field(default=None)
    condition: str | None = Field(default=None)

class AssetRead(BaseModel):
    id: int
    permanent_id: str
    name: str
    serial_number: str | None
    model_number: str | None
    description: str | None
    status: AssetStatus
    category_id: int
    location_id: int
    supplier_id: int | None
    created_at: datetime
    updated_at: datetime

    purchase_date: datetime | None
    purchase_cost: float | None
    invoice_number: str | None
    warranty_expiry: datetime | None
    purchase_notes: str | None
    photos: list[str]
    notes: str | None
    condition: str

    category: CategoryRead
    location: LocationRead
    supplier: SupplierRead | None

    model_config = ConfigDict(from_attributes=True)


class CategoryUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=80)
    description: str | None = Field(default=None, max_length=500)
    is_active: bool | None = Field(default=None)


class LocationUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=80)
    description: str | None = Field(default=None, max_length=500)
    is_active: bool | None = Field(default=None)


class SupplierUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=80)
    contact_info: str | None = Field(default=None)
    is_active: bool | None = Field(default=None)
