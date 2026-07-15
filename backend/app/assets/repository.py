from sqlalchemy import func, select
from sqlalchemy.orm import InstrumentedAttribute, Session, joinedload

from app.assets.models import AssetCategory, Location, Supplier, Asset, AssetHistory, AssetStatus
from app.core.reference_data import ReferenceDataRepository


def CategoryRepository(db: Session) -> ReferenceDataRepository[AssetCategory]:
    return ReferenceDataRepository(db, AssetCategory)


def LocationRepository(db: Session) -> ReferenceDataRepository[Location]:
    return ReferenceDataRepository(db, Location)


def SupplierRepository(db: Session) -> ReferenceDataRepository[Supplier]:
    return ReferenceDataRepository(db, Supplier)


class AssetRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_active(self, limit: int | None = None, offset: int = 0) -> list[Asset]:
        query = (
            select(Asset)
            .where(Asset.status != AssetStatus.ARCHIVED)
            .options(
                joinedload(Asset.category),
                joinedload(Asset.location),
                joinedload(Asset.supplier),
            )
            .order_by(Asset.permanent_id.asc())
            .offset(offset)
        )
        if limit is not None:
            query = query.limit(limit)
        return list(self.db.scalars(query))

    def usage_counts_by(self, fk_column: InstrumentedAttribute) -> dict[int, int]:
        """Single grouped query, e.g. counts of non-archived assets per category_id."""
        rows = self.db.execute(
            select(fk_column, func.count(Asset.id))
            .where(Asset.status != AssetStatus.ARCHIVED, fk_column.is_not(None))
            .group_by(fk_column)
        ).all()
        return {fk_value: count for fk_value, count in rows}

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
