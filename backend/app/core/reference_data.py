from typing import Any, Callable, Generic, TypeVar

from fastapi import HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.audit.service import AuditService

ReferenceModel = TypeVar("ReferenceModel")


class ReferenceDataRepository(Generic[ReferenceModel]):
    """Shared CRUD for lookup tables that only ever have id/name/is_archived.

    Category, Location, Supplier, and Department all follow this exact shape;
    this replaces four near-identical repository classes with one.
    """

    def __init__(self, db: Session, model: type[ReferenceModel]) -> None:
        self.db = db
        self.model = model

    def list_active(self) -> list[ReferenceModel]:
        return list(
            self.db.scalars(
                select(self.model)
                .where(self.model.is_archived.is_(False))
                .order_by(self.model.name.asc())
            )
        )

    def get_by_id(self, item_id: int) -> ReferenceModel | None:
        return self.db.get(self.model, item_id)

    def get_by_name(self, name: str) -> ReferenceModel | None:
        return self.db.scalar(select(self.model).where(self.model.name == name))

    def add(self, item: ReferenceModel) -> ReferenceModel:
        self.db.add(item)
        return item


class ReferenceDataService(Generic[ReferenceModel]):
    """Shared create/update/archive workflow for lookup tables (Category, Location,
    Supplier, Department): name-uniqueness check, mutate, usage-count guard on
    delete, audit log entry, commit. Mirrors BorrowingService's extraction of
    router-level business logic into a reusable service.
    """

    def __init__(
        self,
        db: Session,
        model: type[ReferenceModel],
        *,
        entity_type: str,
        not_found_detail: str,
        create_conflict_detail: str,
        update_conflict_detail: str,
        create_action: str,
        update_action: str,
        delete_action: str,
        delete_success_message: str,
        usage_count_fn: Callable[[int], int] | None = None,
        usage_conflict_detail: str | None = None,
    ) -> None:
        self.db = db
        self.model = model
        self.repo = ReferenceDataRepository(db, model)
        self.audit = AuditService(db)
        self.entity_type = entity_type
        self.not_found_detail = not_found_detail
        self.create_conflict_detail = create_conflict_detail
        self.update_conflict_detail = update_conflict_detail
        self.create_action = create_action
        self.update_action = update_action
        self.delete_action = delete_action
        self.delete_success_message = delete_success_message
        self.usage_count_fn = usage_count_fn
        self.usage_conflict_detail = usage_conflict_detail

    def list_active(self, usage_counts: dict[int, int] | None = None) -> list[ReferenceModel]:
        items = self.repo.list_active()
        if usage_counts is not None:
            for item in items:
                item.usage_count = usage_counts.get(item.id, 0)
        return items

    def create(self, payload: BaseModel, actor) -> ReferenceModel:
        fields: dict[str, Any] = payload.model_dump()
        if fields.get("is_active") is None and "is_active" in fields:
            fields["is_active"] = True

        existing = self.repo.get_by_name(fields["name"])
        if existing and not existing.is_archived:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=self.create_conflict_detail)

        item = self.repo.add(self.model(**fields))
        self.db.flush()
        self.audit.record(
            actor_user_id=actor.id,
            action=self.create_action,
            entity_type=self.entity_type,
            entity_id=str(item.id),
            metadata={"name": item.name},
        )
        self.db.commit()
        self.db.refresh(item)
        return item

    def update(self, item_id: int, payload: BaseModel, actor) -> ReferenceModel:
        item = self.repo.get_by_id(item_id)
        if not item or item.is_archived:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=self.not_found_detail)

        if getattr(payload, "name", None):
            existing = self.repo.get_by_name(payload.name)
            if existing and existing.id != item_id and not existing.is_archived:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=self.update_conflict_detail)

        for field, val in payload.model_dump(exclude_unset=True).items():
            setattr(item, field, val)

        self.audit.record(
            actor_user_id=actor.id,
            action=self.update_action,
            entity_type=self.entity_type,
            entity_id=str(item.id),
            metadata={"name": item.name},
        )
        self.db.commit()
        self.db.refresh(item)
        return item

    def delete(self, item_id: int, actor) -> dict[str, str]:
        item = self.repo.get_by_id(item_id)
        if not item or item.is_archived:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=self.not_found_detail)

        if self.usage_count_fn is not None and self.usage_count_fn(item_id) > 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=self.usage_conflict_detail)

        item.is_archived = True
        self.audit.record(
            actor_user_id=actor.id,
            action=self.delete_action,
            entity_type=self.entity_type,
            entity_id=str(item.id),
            metadata={"name": item.name},
        )
        self.db.commit()
        return {"message": self.delete_success_message}
