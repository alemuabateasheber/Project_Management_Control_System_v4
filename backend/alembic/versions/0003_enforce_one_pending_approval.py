"""enforce one pending approval per record

Revision ID: 0003_enforce_one_pending_approval
Revises: 0002_add_performance_indexes
"""

from alembic import op
import sqlalchemy as sa


revision = "0003_enforce_one_pending_approval"
down_revision = "0002_add_performance_indexes"
branch_labels = None
depends_on = None


def upgrade():
    op.create_index(
        "uq_approvals_one_pending_per_record",
        "approvals",
        ["record_id"],
        unique=True,
        postgresql_where=sa.text("status = 'pending'"),
    )


def downgrade():
    op.drop_index("uq_approvals_one_pending_per_record", table_name="approvals")
