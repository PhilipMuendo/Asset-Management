"""merge_locations_into_branches

Revision ID: d2e3f4a5b6c7
Revises: c1a2b3d4e5f6
Create Date: 2026-07-20 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "d2e3f4a5b6c7"
down_revision: Union[str, None] = "c1a2b3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _location_fk_name(bind) -> str | None:
    inspector = sa.inspect(bind)
    for fk in inspector.get_foreign_keys("assets"):
        if fk["constrained_columns"] == ["location_id"]:
            return fk["name"]
    return None


def upgrade() -> None:
    bind = op.get_bind()

    op.add_column("assets", sa.Column("branch_id", sa.Integer(), nullable=True))

    # Every existing Location is, per the company's real usage, the same concept as a
    # Branch (one location = one office). Match each Location to an existing Branch by
    # case-insensitive exact name; anything unmatched gets a new Branch auto-created from
    # the Location's data. Location never captured country/code, so those get placeholder
    # values the user must review in Configurations -> Branches after this migration runs.
    locations_t = sa.table(
        "locations",
        sa.column("id", sa.Integer),
        sa.column("name", sa.String),
        sa.column("description", sa.String),
        sa.column("is_archived", sa.Boolean),
        sa.column("is_active", sa.Boolean),
    )
    branches_t = sa.table(
        "branches",
        sa.column("id", sa.Integer),
        sa.column("name", sa.String),
        sa.column("code", sa.String),
        sa.column("country", sa.String),
        sa.column("address", sa.String),
        sa.column("is_archived", sa.Boolean),
        sa.column("is_active", sa.Boolean),
    )
    assets_t = sa.table(
        "assets",
        sa.column("id", sa.Integer),
        sa.column("location_id", sa.Integer),
        sa.column("branch_id", sa.Integer),
    )

    locations = bind.execute(sa.select(locations_t)).mappings().all()
    existing_branches = bind.execute(sa.select(branches_t.c.id, branches_t.c.name)).all()
    branch_by_lower_name = {name.strip().lower(): bid for bid, name in existing_branches}

    for loc in locations:
        key = (loc["name"] or "").strip().lower()
        branch_id = branch_by_lower_name.get(key)
        if branch_id is None:
            result = bind.execute(
                branches_t.insert()
                .values(
                    name=loc["name"],
                    code=f"LOC{loc['id']}"[:10],
                    country="Unknown",
                    address=loc["description"],
                    is_archived=loc["is_archived"],
                    is_active=loc["is_active"],
                )
                .returning(branches_t.c.id)
            )
            branch_id = result.scalar_one()
            branch_by_lower_name[key] = branch_id

        bind.execute(
            assets_t.update()
            .where(assets_t.c.location_id == loc["id"])
            .values(branch_id=branch_id)
        )

    op.alter_column("assets", "branch_id", nullable=False)
    op.create_foreign_key("fk_assets_branch_id", "assets", "branches", ["branch_id"], ["id"])

    old_fk_name = _location_fk_name(bind)
    if old_fk_name:
        op.drop_constraint(old_fk_name, "assets", type_="foreignkey")
    op.drop_column("assets", "location_id")

    op.drop_index(op.f("ix_locations_name"), table_name="locations")
    op.drop_table("locations")


def downgrade() -> None:
    # Best-effort only: reliable if run immediately after upgrade with no further branch
    # changes in between. Does not restore original Location rows or undo any Branch
    # edits (code/country corrections, new branches, admin assignments) made after upgrade.
    bind = op.get_bind()

    op.create_table(
        "locations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=80), nullable=False),
        sa.Column("description", sa.String(length=500), nullable=True),
        sa.Column("is_archived", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_locations_name"), "locations", ["name"], unique=True)

    op.add_column("assets", sa.Column("location_id", sa.Integer(), nullable=True))

    locations_t = sa.table(
        "locations",
        sa.column("id", sa.Integer),
        sa.column("name", sa.String),
        sa.column("description", sa.String),
        sa.column("is_archived", sa.Boolean),
        sa.column("is_active", sa.Boolean),
    )
    branches_t = sa.table(
        "branches",
        sa.column("id", sa.Integer),
        sa.column("name", sa.String),
        sa.column("address", sa.String),
        sa.column("is_archived", sa.Boolean),
        sa.column("is_active", sa.Boolean),
    )
    assets_t = sa.table(
        "assets",
        sa.column("id", sa.Integer),
        sa.column("location_id", sa.Integer),
        sa.column("branch_id", sa.Integer),
    )

    used_branch_ids = bind.execute(
        sa.select(assets_t.c.branch_id).distinct().where(assets_t.c.branch_id.is_not(None))
    ).scalars().all()

    for branch_id in used_branch_ids:
        branch = bind.execute(
            sa.select(branches_t).where(branches_t.c.id == branch_id)
        ).mappings().first()
        if branch is None:
            continue
        result = bind.execute(
            locations_t.insert()
            .values(
                name=branch["name"],
                description=branch["address"],
                is_archived=branch["is_archived"],
                is_active=branch["is_active"],
            )
            .returning(locations_t.c.id)
        )
        location_id = result.scalar_one()
        bind.execute(
            assets_t.update()
            .where(assets_t.c.branch_id == branch_id)
            .values(location_id=location_id)
        )

    op.alter_column("assets", "location_id", nullable=False)
    op.create_foreign_key(None, "assets", "locations", ["location_id"], ["id"])

    op.drop_constraint("fk_assets_branch_id", "assets", type_="foreignkey")
    op.drop_column("assets", "branch_id")
