from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload
from app.assets.models import AssetCategory, Location, Supplier, Asset, AssetHistory, AssetStatus

class CategoryRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_active(self) -> list[AssetCategory]:
        return list(
            self.db.scalars(
                select(AssetCategory)
                .where(AssetCategory.is_archived.is_(False))
                .order_by(AssetCategory.name.asc())
            )
        )

    def get_by_id(self, category_id: int) -> AssetCategory | None:
        return self.db.get(AssetCategory, category_id)

    def get_by_name(self, name: str) -> AssetCategory | None:
        return self.db.scalar(select(AssetCategory).where(AssetCategory.name == name))

    def add(self, category: AssetCategory) -> AssetCategory:
        self.db.add(category)
        return category


class LocationRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_active(self) -> list[Location]:
        return list(
            self.db.scalars(
                select(Location)
                .where(Location.is_archived.is_(False))
                .order_by(Location.name.asc())
            )
        )

    def get_by_id(self, location_id: int) -> Location | None:
        return self.db.get(Location, location_id)

    def get_by_name(self, name: str) -> Location | None:
        return self.db.scalar(select(Location).where(Location.name == name))

    def add(self, location: Location) -> Location:
        self.db.add(location)
        return location


class SupplierRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_active(self) -> list[Supplier]:
        return list(
            self.db.scalars(
                select(Supplier)
                .where(Supplier.is_archived.is_(False))
                .order_by(Supplier.name.asc())
            )
        )

    def get_by_id(self, supplier_id: int) -> Supplier | None:
        return self.db.get(Supplier, supplier_id)

    def get_by_name(self, name: str) -> Supplier | None:
        return self.db.scalar(select(Supplier).where(Supplier.name == name))

    def add(self, supplier: Supplier) -> Supplier:
        self.db.add(supplier)
        return supplier


class AssetRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_active(self) -> list[Asset]:
        return list(
            self.db.scalars(
                select(Asset)
                .where(Asset.status != AssetStatus.ARCHIVED)
                .options(
                    joinedload(Asset.category),
                    joinedload(Asset.location),
                    joinedload(Asset.supplier),
                )
                .order_by(Asset.permanent_id.asc())
            )
        )

    def get_by_id(self, asset_id: int) -> Asset | None:
        return self.db.get(Asset, asset_id)

    def get_by_permanent_id(self, permanent_id: str) -> Asset | None:
        return self.db.scalar(select(Asset).where(Asset.permanent_id == permanent_id.upper()))

    def get_by_serial(self, serial: str) -> Asset | None:
        return self.db.scalar(select(Asset).where(Asset.serial_number == serial))

    def add(self, asset: Asset) -> Asset:
        self.db.add(asset)
        return asset

    def list_history(self, asset_id: int) -> list[AssetHistory]:
        return list(
            self.db.scalars(
                select(AssetHistory)
                .where(AssetHistory.asset_id == asset_id)
                .order_by(AssetHistory.created_at.desc())
            )
        )

    def add_history(self, history: AssetHistory) -> AssetHistory:
        self.db.add(history)
        return history
