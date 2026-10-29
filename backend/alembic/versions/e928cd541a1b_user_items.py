"""Persist user-specific limits, positions and recurring expenses."""
from alembic import op
import sqlalchemy as sa

revision = "e928cd541a1b"
down_revision = "c90400e452f2"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("user_items",
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("kind", sa.String(20), primary_key=True),
        sa.Column("key", sa.String(200), primary_key=True),
        sa.Column("value", sa.JSON, nullable=False))


def downgrade():
    raise RuntimeError("Downgrading would delete saved financial data")
