"""Persist account provider and interest rate."""
from alembic import op
import sqlalchemy as sa

revision = "b8d4e0f2a1c3"
down_revision = "a7c3d9e1f2b4"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("accounts", sa.Column("provider", sa.String, nullable=True))
    op.add_column("accounts", sa.Column("interest_rate", sa.Numeric, nullable=True))


def downgrade():
    op.drop_column("accounts", "interest_rate")
    op.drop_column("accounts", "provider")
