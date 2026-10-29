"""Share authentication limits between processes."""
from alembic import op
import sqlalchemy as sa

revision = "c90400e452f2"
down_revision = "be17b829a9c4"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("auth_attempts", sa.Column("client_key", sa.String(), nullable=False),
                    sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()))
    op.create_index("ix_auth_attempts_created_at", "auth_attempts", ["created_at"])
    op.create_index("ix_auth_attempts_client_key", "auth_attempts", ["client_key"])


def downgrade():
    op.drop_table("auth_attempts")
