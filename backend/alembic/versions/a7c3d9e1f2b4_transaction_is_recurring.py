"""Persist the recurring/mandatory flag of a transaction."""
from alembic import op
import sqlalchemy as sa

revision = "a7c3d9e1f2b4"
down_revision = "f1a2b3c4d5e6"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("transactions", sa.Column("is_recurring", sa.Boolean, nullable=False, server_default=sa.false()))


def downgrade():
    op.drop_column("transactions", "is_recurring")
