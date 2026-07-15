from typing import Generic, TypeVar

from sqlalchemy import select
from sqlalchemy.orm import Session

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
