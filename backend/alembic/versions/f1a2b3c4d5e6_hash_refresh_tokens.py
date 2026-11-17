"""Hash refresh tokens already stored in the database."""

import hashlib

from alembic import op
import sqlalchemy as sa


revision = "f1a2b3c4d5e6"
down_revision = "e928cd541a1b"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    rows = bind.execute(sa.text("SELECT id, token FROM refresh_tokens")).fetchall()
    for token_id, token in rows:
        hashed = hashlib.sha256(token.encode("utf-8")).hexdigest()
        bind.execute(
            sa.text("UPDATE refresh_tokens SET token = :token WHERE id = :id"),
            {"token": hashed, "id": token_id},
        )


def downgrade() -> None:
    raise RuntimeError("Refresh token hashes cannot be converted back to usable tokens")
