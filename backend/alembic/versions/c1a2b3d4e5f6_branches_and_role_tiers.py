"""branches_and_role_tiers

Revision ID: c1a2b3d4e5f6
Revises: 9ae0bf8004b0
Create Date: 2026-07-20 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "c1a2b3d4e5f6"
down_revision: Union[str, None] = "9ae0bf8004b0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

user_role_new = postgresql.ENUM("superadmin", "admin", "staff", name="user_role", create_type=False)
user_role_old = postgresql.ENUM("admin", "staff", name="user_role_old", create_type=False)


def upgrade() -> None:
    op.create_table(
        "branches",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("code", sa.String(length=10), nullable=False),
        sa.Column("country", sa.String(length=80), nullable=False),
        sa.Column("address", sa.String(length=500), nullable=True),
        sa.Column("is_archived", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name", name="uq_branches_name"),
        sa.UniqueConstraint("code", name="uq_branches_code"),
    )

    # Postgres forbids using a freshly-added enum label inside the same transaction that added it.
    # This project runs every migration inside one shared outer transaction (see alembic/env.py), so
    # the ALTER TYPE has to be broken out into its own autocommit block rather than a second migration file.
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'superadmin'")

    op.add_column("users", sa.Column("branch_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_users_branch_id", "users", "branches", ["branch_id"], ["id"], ondelete="SET NULL"
    )
    op.create_index("ix_users_branch_id", "users", ["branch_id"], unique=False)

    op.create_table(
        "admin_category_assignments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("admin_id", sa.Integer(), nullable=False),
        sa.Column("category_id", sa.Integer(), nullable=False),
        sa.Column("assigned_by_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["admin_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["category_id"], ["asset_categories.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["assigned_by_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("admin_id", "category_id", name="uq_admin_category"),
    )

    op.add_column("borrow_requests", sa.Column("branch_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_borrow_requests_branch_id", "borrow_requests", "branches", ["branch_id"], ["id"], ondelete="SET NULL"
    )
    op.create_index("ix_borrow_requests_branch_id", "borrow_requests", ["branch_id"], unique=False)

    # Promote every existing admin (including the bootstrap first-admin) to superadmin so nobody
    # loses access. This runs after the autocommit_block above, in a freshly re-opened transaction,
    # so the new 'superadmin' label is safely visible here.
    op.execute("UPDATE users SET role = 'superadmin' WHERE role = 'admin'")


def downgrade() -> None:
    op.execute("UPDATE users SET role = 'admin' WHERE role = 'superadmin'")

    op.drop_index("ix_borrow_requests_branch_id", table_name="borrow_requests")
    op.drop_constraint("fk_borrow_requests_branch_id", "borrow_requests", type_="foreignkey")
    op.drop_column("borrow_requests", "branch_id")

    op.drop_table("admin_category_assignments")

    op.drop_index("ix_users_branch_id", table_name="users")
    op.drop_constraint("fk_users_branch_id", "users", type_="foreignkey")
    op.drop_column("users", "branch_id")

    # Postgres has no DROP VALUE for enums: rebuild user_role with the original 2 values.
    user_role_old.create(op.get_bind(), checkfirst=True)
    op.execute(
        "ALTER TABLE users ALTER COLUMN role TYPE user_role_old USING role::text::user_role_old"
    )
    op.execute("DROP TYPE user_role")
    op.execute("ALTER TYPE user_role_old RENAME TO user_role")

    op.drop_table("branches")
