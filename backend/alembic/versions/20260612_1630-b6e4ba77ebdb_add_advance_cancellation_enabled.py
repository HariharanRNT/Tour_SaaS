"""Add advance cancellation enabled

Revision ID: b6e4ba77ebdb
Revises: 0002
Create Date: 2026-06-12 16:30:59.893673

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b6e4ba77ebdb'
down_revision: Union[str, None] = '0002'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('packages', sa.Column('advance_cancellation_enabled', sa.Boolean(), server_default='false', nullable=True))
    op.add_column('bookings', sa.Column('advance_cancellation_enabled', sa.Boolean(), server_default='false', nullable=True))

def downgrade() -> None:
    op.drop_column('packages', 'advance_cancellation_enabled')
    op.drop_column('bookings', 'advance_cancellation_enabled')
