"""add ownership to goals and savings

Revision ID: 7d1f4b2c9a10
Revises: 3b53e69737c1
Create Date: 2026-09-26

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "7d1f4b2c9a10"
down_revision: Union[str, None] = "3b53e69737c1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "goals",
        sa.Column("currency", sa.String(), nullable=False, server_default="USD"),
    )
    op.add_column("goals", sa.Column("linked_account_id", sa.Integer(), nullable=True))
    op.add_column("goals", sa.Column("user_id", sa.Integer(), nullable=True))
    op.add_column("savings", sa.Column("user_id", sa.Integer(), nullable=True))

    bind = op.get_bind()
    user_ids = [row[0] for row in bind.execute(sa.text("SELECT id FROM users")).fetchall()]

    for table_name in ("goals", "savings"):
        row_count = bind.execute(
            sa.text(f"SELECT COUNT(*) FROM {table_name} WHERE user_id IS NULL")
        ).scalar_one()
        if row_count:
            if len(user_ids) != 1:
                raise RuntimeError(
                    f"Cannot migrate {table_name}: existing rows need an explicit owner "
                    "before the migration can enforce user isolation."
                )
            bind.execute(
                sa.text(f"UPDATE {table_name} SET user_id = :user_id WHERE user_id IS NULL"),
                {"user_id": user_ids[0]},
            )

    for table_name in ("goals", "savings"):
        op.alter_column(table_name, "user_id", nullable=False)
        op.create_foreign_key(
            f"fk_{table_name}_user_id_users",
            table_name,
            "users",
            ["user_id"],
            ["id"],
            ondelete="CASCADE",
        )
        op.create_index(f"ix_{table_name}_user_id", table_name, ["user_id"])

    op.create_foreign_key(
        "fk_goals_linked_account_id_accounts",
        "goals",
        "accounts",
        ["linked_account_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.alter_column("goals", "currency", server_default=None)


def downgrade() -> None:
    op.drop_constraint(
        "fk_goals_linked_account_id_accounts",
        "goals",
        type_="foreignkey",
    )
    op.drop_column("goals", "linked_account_id")
    op.drop_column("goals", "currency")
    for table_name in ("goals", "savings"):
        op.drop_index(f"ix_{table_name}_user_id", table_name=table_name)
        op.drop_constraint(
            f"fk_{table_name}_user_id_users",
            table_name,
            type_="foreignkey",
        )
        op.drop_column(table_name, "user_id")
