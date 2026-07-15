from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from app.audit.service import AuditService
from app.core.dependencies import get_db, require_admin, get_current_user
from app.assets.models import AssetCategory, Location, Supplier, Asset, AssetHistory, AssetStatus
from app.assets.repository import CategoryRepository, LocationRepository, SupplierRepository, AssetRepository
from app.assets.schemas import (
    CategoryCreate, CategoryRead, CategoryUpdate,
    LocationCreate, LocationRead, LocationUpdate,
    SupplierCreate, SupplierRead, SupplierUpdate,
    AssetCreate, AssetUpdate, AssetRead,
    AssetHistoryRead
)
from app.users.models import User

router = APIRouter()

# --- Categories ---
@router.get("/categories", response_model=list[CategoryRead])
def list_categories(db: Session = Depends(get_db)) -> list[AssetCategory]:
    items = CategoryRepository(db).list_active()
    counts = AssetRepository(db).usage_counts_by(Asset.category_id)
    for item in items:
        item.usage_count = counts.get(item.id, 0)
    return items

@router.post("/categories", response_model=CategoryRead, status_code=status.HTTP_201_CREATED)
def create_category(
    payload: CategoryCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> AssetCategory:
    repo = CategoryRepository(db)
    existing = repo.get_by_name(payload.name)
    if existing and not existing.is_archived:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Category name already exists")

    category = repo.add(AssetCategory(name=payload.name, description=payload.description, is_active=payload.is_active if payload.is_active is not None else True))
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

@router.patch("/categories/{category_id}", response_model=CategoryRead)
def update_category(
    category_id: int,
    payload: CategoryUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> AssetCategory:
    repo = CategoryRepository(db)
    category = repo.get_by_id(category_id)
    if not category or category.is_archived:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

    if payload.name:
        existing = repo.get_by_name(payload.name)
        if existing and existing.id != category_id and not existing.is_archived:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Another category with this name already exists")

    for field, val in payload.model_dump(exclude_unset=True).items():
        setattr(category, field, val)

    AuditService(db).record(
        actor_user_id=admin.id,
        action="category.edited",
        entity_type="category",
        entity_id=str(category.id),
        metadata={"name": category.name},
    )
    db.commit()
    db.refresh(category)
    return category

@router.delete("/categories/{category_id}")
def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    repo = CategoryRepository(db)
    category = repo.get_by_id(category_id)
    if not category or category.is_archived:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

    usage_count = db.scalar(
        select(func.count(Asset.id)).where(Asset.category_id == category_id, Asset.status != AssetStatus.ARCHIVED)
    ) or 0
    if usage_count > 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Categories with linked assets cannot be deleted")

    category.is_archived = True
    AuditService(db).record(
        actor_user_id=admin.id,
        action="category.archived",
        entity_type="category",
        entity_id=str(category.id),
        metadata={"name": category.name},
    )
    db.commit()
    return {"message": "Category deleted successfully"}


# --- Locations ---
@router.get("/locations", response_model=list[LocationRead])
def list_locations(db: Session = Depends(get_db)) -> list[Location]:
    items = LocationRepository(db).list_active()
    counts = AssetRepository(db).usage_counts_by(Asset.location_id)
    for item in items:
        item.usage_count = counts.get(item.id, 0)
    return items

@router.post("/locations", response_model=LocationRead, status_code=status.HTTP_201_CREATED)
def create_location(
    payload: LocationCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> Location:
    repo = LocationRepository(db)
    existing = repo.get_by_name(payload.name)
    if existing and not existing.is_archived:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Location name already exists")

    location = repo.add(Location(name=payload.name, description=payload.description, is_active=payload.is_active if payload.is_active is not None else True))
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

@router.patch("/locations/{location_id}", response_model=LocationRead)
def update_location(
    location_id: int,
    payload: LocationUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> Location:
    repo = LocationRepository(db)
    location = repo.get_by_id(location_id)
    if not location or location.is_archived:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Location not found")

    if payload.name:
        existing = repo.get_by_name(payload.name)
        if existing and existing.id != location_id and not existing.is_archived:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Another location with this name already exists")

    for field, val in payload.model_dump(exclude_unset=True).items():
        setattr(location, field, val)

    AuditService(db).record(
        actor_user_id=admin.id,
        action="location.renamed",
        entity_type="location",
        entity_id=str(location.id),
        metadata={"name": location.name},
    )
    db.commit()
    db.refresh(location)
    return location

@router.delete("/locations/{location_id}")
def delete_location(
    location_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    repo = LocationRepository(db)
    location = repo.get_by_id(location_id)
    if not location or location.is_archived:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Location not found")

    usage_count = db.scalar(
        select(func.count(Asset.id)).where(Asset.location_id == location_id, Asset.status != AssetStatus.ARCHIVED)
    ) or 0
    if usage_count > 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Locations with linked assets cannot be deleted")

    location.is_archived = True
    AuditService(db).record(
        actor_user_id=admin.id,
        action="location.archived",
        entity_type="location",
        entity_id=str(location.id),
        metadata={"name": location.name},
    )
    db.commit()
    return {"message": "Location deleted successfully"}


# --- Suppliers ---
@router.get("/suppliers", response_model=list[SupplierRead])
def list_suppliers(db: Session = Depends(get_db)) -> list[Supplier]:
    items = SupplierRepository(db).list_active()
    counts = AssetRepository(db).usage_counts_by(Asset.supplier_id)
    for item in items:
        item.usage_count = counts.get(item.id, 0)
    return items

@router.post("/suppliers", response_model=SupplierRead, status_code=status.HTTP_201_CREATED)
def create_supplier(
    payload: SupplierCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> Supplier:
    repo = SupplierRepository(db)
    existing = repo.get_by_name(payload.name)
    if existing and not existing.is_archived:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Supplier name already exists")

    supplier = repo.add(Supplier(name=payload.name, contact_info=payload.contact_info, is_active=payload.is_active if payload.is_active is not None else True))
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

@router.patch("/suppliers/{supplier_id}", response_model=SupplierRead)
def update_supplier(
    supplier_id: int,
    payload: SupplierUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> Supplier:
    repo = SupplierRepository(db)
    supplier = repo.get_by_id(supplier_id)
    if not supplier or supplier.is_archived:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supplier not found")

    if payload.name:
        existing = repo.get_by_name(payload.name)
        if existing and existing.id != supplier_id and not existing.is_archived:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Another supplier with this name already exists")

    for field, val in payload.model_dump(exclude_unset=True).items():
        setattr(supplier, field, val)

    AuditService(db).record(
        actor_user_id=admin.id,
        action="supplier.edited",
        entity_type="supplier",
        entity_id=str(supplier.id),
        metadata={"name": supplier.name},
    )
    db.commit()
    db.refresh(supplier)
    return supplier

@router.delete("/suppliers/{supplier_id}")
def delete_supplier(
    supplier_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    repo = SupplierRepository(db)
    supplier = repo.get_by_id(supplier_id)
    if not supplier or supplier.is_archived:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supplier not found")

    usage_count = db.scalar(
        select(func.count(Asset.id)).where(Asset.supplier_id == supplier_id, Asset.status != AssetStatus.ARCHIVED)
    ) or 0
    if usage_count > 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Suppliers with linked assets cannot be deleted")

    supplier.is_archived = True
    AuditService(db).record(
        actor_user_id=admin.id,
        action="supplier.archived",
        entity_type="supplier",
        entity_id=str(supplier.id),
        metadata={"name": supplier.name},
    )
    db.commit()
    return {"message": "Supplier deleted successfully"}


# --- Assets ---
@router.get("", response_model=list[AssetRead])
def list_assets(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    # Frontend currently fetches the full catalog for client-side search; this is a
    # safety cap against unbounded scans, not real pagination yet (see Phase 2 UI work).
    limit: int = Query(2000, ge=1, le=5000),
    offset: int = Query(0, ge=0),
) -> list[Asset]:
    return AssetRepository(db).list_active(limit=limit, offset=offset)

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
    
    # Audit changes field by field
    updates = payload.model_dump(exclude_unset=True)

    # Enforce repair restriction
    if asset.status in (AssetStatus.DAMAGED, AssetStatus.LOST):
        new_cond = updates.get("condition")
        new_status = updates.get("status")
        if new_cond in ("Excellent", "Good", "Fair"):
            updates["status"] = AssetStatus.AVAILABLE
        elif new_status == AssetStatus.AVAILABLE:
            current_cond = new_cond if new_cond is not None else asset.condition
            if current_cond not in ("Excellent", "Good", "Fair"):
                raise HTTPException(
                    status_code=400,
                    detail="Only after the item has been repaired can it be made available once more"
                )

    for field, val in updates.items():
        # Prevent mutating permanent_id even if passed
        if field == "permanent_id":
            raise HTTPException(status_code=400, detail="Asset ID is permanent and cannot be modified")

        old_val = getattr(asset, field)
        if old_val != val:
            setattr(asset, field, val)
            
            # Record field-level update
            AuditService(db).record(
                actor_user_id=admin.id,
                action="asset.updated",
                entity_type="asset",
                entity_id=str(asset.id),
                metadata={
                    "field": field,
                    "old_value": str(old_val) if old_val is not None else "None",
                    "new_value": str(val) if val is not None else "None"
                },
            )
            
            repo.add_history(AssetHistory(
                asset_id=asset.id,
                user_id=admin.id,
                action="updated",
                previous_status=prev_status if field == "status" else None,
                new_status=val if field == "status" else None,
                notes=f"Field '{field}' changed from '{old_val}' to '{val}'"
            ))

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


@router.post("/{asset_id}/reprint-qr")
def record_qr_reprint(
    asset_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    asset = db.get(Asset, asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
        
    AuditService(db).record(
        actor_user_id=admin.id,
        action="asset.qr_reprinted",
        entity_type="asset",
        entity_id=str(asset.id),
        metadata={"permanent_id": asset.permanent_id},
    )
    db.add(AssetHistory(
        asset_id=asset.id,
        user_id=admin.id,
        action="qr_reprinted",
        notes="QR code label reprinted/downloaded by admin"
    ))
    db.commit()
    return {"message": "QR reprint audit recorded"}


@router.get("/{asset_id}/qr-pdf")
def get_asset_qr_pdf(
    asset_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    import io
    import qrcode
    from PIL import Image, ImageDraw
    from fastapi.responses import StreamingResponse

    asset = db.get(Asset, asset_id)
    if not asset or asset.status == AssetStatus.ARCHIVED:
        raise HTTPException(status_code=404, detail="Asset not found")

    # Generate QR Code image
    qr = qrcode.QRCode(version=1, box_size=5, border=1)
    qr.add_data(asset.permanent_id)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="black", back_color="white").convert("RGB")

    # Create label canvas (3in x 2in at 150 DPI = 450x300 pixels)
    img = Image.new("RGB", (450, 300), "white")
    
    # Resize QR to fit nicely and paste
    qr_img_resized = qr_img.resize((160, 160))
    img.paste(qr_img_resized, (145, 15))

    # Draw label text
    draw = ImageDraw.Draw(img)
    
    # We can draw the text using basic default font since TTF path varies by OS.
    # We center the text lines at the bottom of the label.
    id_text = f"ID: {asset.permanent_id}"
    name_text = asset.name[:35]
    org_text = "COLLECTIVE ENERGY AFRICA"

    draw.text((225, 200), id_text, fill="black", anchor="mm")
    draw.text((225, 225), name_text, fill="black", anchor="mm")
    draw.text((225, 255), org_text, fill="gray", anchor="mm")

    # Save to memory buffer as PDF
    pdf_buffer = io.BytesIO()
    img.save(pdf_buffer, format="PDF")
    pdf_buffer.seek(0)

    # Record audit log
    AuditService(db).record(
        actor_user_id=user.id,
        action="asset.qr_pdf_downloaded",
        entity_type="asset",
        entity_id=str(asset.id),
        metadata={"permanent_id": asset.permanent_id},
    )
    db.add(AssetHistory(
        asset_id=asset.id,
        user_id=user.id,
        action="qr_pdf_downloaded",
        notes="QR code label PDF downloaded"
    ))
    db.commit()

    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=Label_{asset.permanent_id}.pdf"}
    )

