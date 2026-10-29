"""Store monetary values as decimal numbers."""
from alembic import op
import sqlalchemy as sa

revision = "be17b829a9c4"
down_revision = "7d1f4b2c9a10"
branch_labels = None
depends_on = None

FIELDS = (("accounts", "balance"), ("transactions", "amount"),
          ("categories", "limit"), ("goals", "target_amount"),
          ("goals", "current_amount"), ("savings", "balance"))


def upgrade():
    for table, column in FIELDS:
        op.alter_column(table, column, type_=sa.Numeric(), postgresql_using=f'"{column}"::numeric')


def downgrade():
    raise RuntimeError("Converting decimal money back to float would lose precision")
