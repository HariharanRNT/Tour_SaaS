"""Alembic migration: Add itinerary_carts table

Revision ID: add_itinerary_carts
Revises: (previous revision)
Create Date: 2026-01-19

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = 'add_itinerary_carts'
down_revision = None  # Update this to your latest migration
branch_labels = None
depends_on = None


def upgrade():
    """Create itinerary_carts table"""
    op.create_table(
        'itinerary_carts',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column('destination', sa.String(255), nullable=False),
        sa.Column('start_date', sa.String(10), nullable=False),
        sa.Column('end_date', sa.String(10), nullable=False),
        sa.Column('total_days', sa.Integer(), nullable=False),
        sa.Column('itinerary_data', postgresql.JSON(), nullable=False),
        sa.Column('total_price', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('currency', sa.String(3), nullable=False, server_default='USD'),
        sa.Column('status', sa.String(20), server_default='active'),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('last_validated_at', sa.DateTime(), nullable=True),
        sa.Column('validation_result', postgresql.JSON(), nullable=True),
        sa.Column('preferences', postgresql.JSON(), nullable=True),
    )
    
    # Create indexes
    op.create_index('ix_itinerary_carts_user_id', 'itinerary_carts', ['user_id'])
    op.create_index('ix_itinerary_carts_status', 'itinerary_carts', ['status'])
    op.create_index('ix_itinerary_carts_expires_at', 'itinerary_carts', ['expires_at'])


def downgrade():
    """Drop itinerary_carts table"""
    op.drop_index('ix_itinerary_carts_expires_at', table_name='itinerary_carts')
    op.drop_index('ix_itinerary_carts_status', table_name='itinerary_carts')
    op.drop_index('ix_itinerary_carts_user_id', table_name='itinerary_carts')
    op.drop_table('itinerary_carts')
