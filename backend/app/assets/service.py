from typing import Callable

from sqlalchemy.orm import InstrumentedAttribute, Session

from app.assets.models import Asset, AssetCategory, Supplier
from app.assets.repository import AssetRepository
from app.core.reference_data import ReferenceDataService


def _usage_count(db: Session, fk_column: InstrumentedAttribute) -> Callable[[int], int]:
    def _count(item_id: int) -> int:
        return AssetRepository(db).usage_counts_by(fk_column).get(item_id, 0)

    return _count


def CategoryService(db: Session) -> ReferenceDataService[AssetCategory]:
    return ReferenceDataService(
        db,
        AssetCategory,
        entity_type="category",
        not_found_detail="Category not found",
        create_conflict_detail="Category name already exists",
        update_conflict_detail="Another category with this name already exists",
        create_action="category.created",
        update_action="category.edited",
        delete_action="category.archived",
        delete_success_message="Category deleted successfully",
        usage_count_fn=_usage_count(db, Asset.category_id),
        usage_conflict_detail="Categories with linked assets cannot be deleted",
    )


def SupplierService(db: Session) -> ReferenceDataService[Supplier]:
    return ReferenceDataService(
        db,
        Supplier,
        entity_type="supplier",
        not_found_detail="Supplier not found",
        create_conflict_detail="Supplier name already exists",
        update_conflict_detail="Another supplier with this name already exists",
        create_action="supplier.created",
        update_action="supplier.edited",
        delete_action="supplier.archived",
        delete_success_message="Supplier deleted successfully",
        usage_count_fn=_usage_count(db, Asset.supplier_id),
        usage_conflict_detail="Suppliers with linked assets cannot be deleted",
    )
