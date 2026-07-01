from __future__ import annotations
from datetime import datetime
from enum import StrEnum
from typing import TYPE_CHECKING
from sqlalchemy import Boolean, ForeignKey, String, Enum, Text, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base
from app.database.mixins import TimestampMixin

if TYPE_CHECKING:
    from app.users.models import User

class AssetStatus(StrEnum):
    AVAILABLE = "available"
    RESERVED = "reserved"
    BORROWED = "borrowed"
    MAINTENANCE = "maintenance"
    LOST = "lost"
    DAMAGED = "damaged"
    ARCHIVED = "archived"


class AssetCategory(TimestampMixin, Base):
    __tablename__ = "asset_categories"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    description: Mapped[str | None] = mapped_column(String(500))
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False)

    assets: Mapped[list[Asset]] = relationship(back_populates="category")


class Location(TimestampMixin, Base):
    __tablename__ = "locations"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    description: Mapped[str | None] = mapped_column(String(500))
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False)

    assets: Mapped[list[Asset]] = relationship(back_populates="location")


class Supplier(TimestampMixin, Base):
    __tablename__ = "suppliers"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    contact_info: Mapped[str | None] = mapped_column(Text)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False)

    assets: Mapped[list[Asset]] = relationship(back_populates="supplier")


class Asset(TimestampMixin, Base):
    __tablename__ = "assets"

    id: Mapped[int] = mapped_column(primary_key=True)
    permanent_id: Mapped[str] = mapped_column(String(40), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(120))
    serial_number: Mapped[str | None] = mapped_column(String(100), unique=True, nullable=True)
    model_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    description: Mapped[str | None] = mapped_column(Text)
    status: Mapped[AssetStatus] = mapped_column(
        Enum(AssetStatus, name="asset_status", values_callable=lambda enum: [item.value for item in enum]),
        default=AssetStatus.AVAILABLE,
        index=True
    )
    category_id: Mapped[int] = mapped_column(ForeignKey("asset_categories.id"))
    location_id: Mapped[int] = mapped_column(ForeignKey("locations.id"))
    supplier_id: Mapped[int | None] = mapped_column(ForeignKey("suppliers.id", ondelete="SET NULL"), nullable=True)

    category: Mapped[AssetCategory] = relationship(back_populates="assets")
    location: Mapped[Location] = relationship(back_populates="assets")
    supplier: Mapped[Supplier | None] = relationship(back_populates="assets")
    history: Mapped[list[AssetHistory]] = relationship(back_populates="asset", cascade="all, delete-orphan")


class AssetHistory(Base):
    __tablename__ = "asset_history"

    id: Mapped[int] = mapped_column(primary_key=True)
    asset_id: Mapped[int] = mapped_column(ForeignKey("assets.id", ondelete="CASCADE"))
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action: Mapped[str] = mapped_column(String(80))
    previous_status: Mapped[str | None] = mapped_column(String(40), nullable=True)
    new_status: Mapped[str | None] = mapped_column(String(40), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    asset: Mapped[Asset] = relationship(back_populates="history")
