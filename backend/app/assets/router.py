from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.audit.service import AuditService
from app.core.dependencies import get_db, require_admin, get_current_user
from app.assets.models import AssetCategory, Location, Supplier, Asset, AssetHistory, AssetStatus
from app.assets.repository import CategoryRepository, LocationRepository, SupplierRepository, AssetRepository
from app.assets.schemas import (
    CategoryCreate, CategoryRead,
    LocationCreate, LocationRead,
    SupplierCreate, SupplierRead,
    AssetCreate, AssetUpdate, AssetRead,
    AssetHistoryRead
)
from app.users.models import User

router = APIRouter()

# --- Categories ---
@router.get("/categories", response_model=list[CategoryRead])
def list_categories(db: Session = Depends(get_db)) -> list[AssetCategory]:
    return CategoryRepository(db).list_active()

@router.post("/categories", response_model=CategoryRead, status_code=status.HTTP_201_CREATED)
def create_category(
    payload: CategoryCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> AssetCategory:
    repo = CategoryRepository(db)
    existing = repo.get_by_name(payload.name)
    if existing and not existing.is_archived:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Category already exists")

    category = repo.add(AssetCategory(name=payload.name, description=payload.description))
    db.flush()
    AuditService(db).record(
        actor_user_id=admin.id,
        action="category.created",
        entity_type="category",
        entity_id=str(category.id),
        metadata={"name": category.name},
    )
    db.commit()
    db.refresh(category)
    return category


# --- Locations ---
@router.get("/locations", response_model=list[LocationRead])
def list_locations(db: Session = Depends(get_db)) -> list[Location]:
    return LocationRepository(db).list_active()

@router.post("/locations", response_model=LocationRead, status_code=status.HTTP_201_CREATED)
def create_location(
    payload: LocationCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> Location:
    repo = LocationRepository(db)
    existing = repo.get_by_name(payload.name)
    if existing and not existing.is_archived:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Location already exists")

    location = repo.add(Location(name=payload.name, description=payload.description))
    db.flush()
    AuditService(db).record(
        actor_user_id=admin.id,
        action="location.created",
        entity_type="location",
        entity_id=str(location.id),
        metadata={"name": location.name},
    )
    db.commit()
    db.refresh(location)
    return location


# --- Suppliers ---
@router.get("/suppliers", response_model=list[SupplierRead])
def list_suppliers(db: Session = Depends(get_db)) -> list[Supplier]:
    return SupplierRepository(db).list_active()

@router.post("/suppliers", response_model=SupplierRead, status_code=status.HTTP_201_CREATED)
def create_supplier(
    payload: SupplierCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> Supplier:
    repo = SupplierRepository(db)
    existing = repo.get_by_name(payload.name)
    if existing and not existing.is_archived:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Supplier already exists")

    supplier = repo.add(Supplier(name=payload.name, contact_info=payload.contact_info))
    db.flush()
    AuditService(db).record(
        actor_user_id=admin.id,
        action="supplier.created",
        entity_type="supplier",
        entity_id=str(supplier.id),
        metadata={"name": supplier.name},
    )
    db.commit()
    db.refresh(supplier)
    return supplier


# --- Assets ---
@router.get("", response_model=list[AssetRead])
def list_assets(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
) -> list[Asset]:
    return AssetRepository(db).list_active()

@router.get("/{asset_id}", response_model=AssetRead)
def get_asset(
    asset_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
) -> Asset:
    asset = AssetRepository(db).get_by_id(asset_id)
    if not asset or asset.status == AssetStatus.ARCHIVED:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")
    return asset

@router.get("/by-permanent-id/{permanent_id}", response_model=AssetRead)
def get_asset_by_permanent_id(
    permanent_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
) -> Asset:
    asset = AssetRepository(db).get_by_permanent_id(permanent_id)
    if not asset or asset.status == AssetStatus.ARCHIVED:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")
    return asset

@router.post("", response_model=AssetRead, status_code=status.HTTP_201_CREATED)
def create_asset(
    payload: AssetCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> Asset:
    repo = AssetRepository(db)
    if repo.get_by_permanent_id(payload.permanent_id):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Asset with this Permanent ID already exists")
    if payload.serial_number and repo.get_by_serial(payload.serial_number):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Asset with this Serial Number already exists")

    asset = repo.add(Asset(
        permanent_id=payload.permanent_id.upper(),
        name=payload.name,
        serial_number=payload.serial_number,
        model_number=payload.model_number,
        description=payload.description,
        category_id=payload.category_id,
        location_id=payload.location_id,
        supplier_id=payload.supplier_id,
        status=AssetStatus.AVAILABLE,
    ))
    db.flush()

    repo.add_history(AssetHistory(
        asset_id=asset.id,
        user_id=admin.id,
        action="registered",
        new_status=AssetStatus.AVAILABLE,
        notes="Initial registration of asset"
    ))
    
    AuditService(db).record(
        actor_user_id=admin.id,
        action="asset.registered",
        entity_type="asset",
        entity_id=str(asset.id),
        metadata={"permanent_id": asset.permanent_id, "name": asset.name},
    )
    db.commit()
    db.refresh(asset)
    return asset

@router.patch("/{asset_id}", response_model=AssetRead)
def update_asset(
    asset_id: int,
    payload: AssetUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> Asset:
    repo = AssetRepository(db)
    asset = repo.get_by_id(asset_id)
    if not asset or asset.status == AssetStatus.ARCHIVED:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")

    prev_status = asset.status
    
    for field, val in payload.model_dump(exclude_unset=True).items():
        setattr(asset, field, val)

    db.flush()

    if payload.status and payload.status != prev_status:
        repo.add_history(AssetHistory(
            asset_id=asset.id,
            user_id=admin.id,
            action="status_change",
            previous_status=prev_status,
            new_status=payload.status,
            notes="Manual status update by admin"
        ))
        
        AuditService(db).record(
            actor_user_id=admin.id,
            action="asset.status_updated",
            entity_type="asset",
            entity_id=str(asset.id),
            metadata={"previous_status": prev_status, "new_status": payload.status},
        )

    db.commit()
    db.refresh(asset)
    return asset

@router.delete("/{asset_id}", response_model=AssetRead)
def archive_asset(
    asset_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> Asset:
    repo = AssetRepository(db)
    asset = repo.get_by_id(asset_id)
    if not asset or asset.status == AssetStatus.ARCHIVED:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")

    prev_status = asset.status
    asset.status = AssetStatus.ARCHIVED
    db.flush()

    repo.add_history(AssetHistory(
        asset_id=asset.id,
        user_id=admin.id,
        action="status_change",
        previous_status=prev_status,
        new_status=AssetStatus.ARCHIVED,
        notes="Asset archived (soft-deleted)"
    ))

    AuditService(db).record(
        actor_user_id=admin.id,
        action="asset.archived",
        entity_type="asset",
        entity_id=str(asset.id),
        metadata={"permanent_id": asset.permanent_id},
    )
    db.commit()
    db.refresh(asset)
    return asset

@router.get("/{asset_id}/history", response_model=list[AssetHistoryRead])
def get_asset_history(
    asset_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
) -> list[AssetHistory]:
    return AssetRepository(db).list_history(asset_id)
