"""Alembic migration: Add master data tables

Revision ID: add_master_data_tables
Revises: 
Create Date: 2026-04-24

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = 'add_master_data_tables'
down_revision = None  # update as needed
branch_labels = None
depends_on = None

def upgrade():
    # trip_styles
    op.create_table(
        'trip_styles',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('icon', sa.String(255), nullable=True),
        sa.Column('created_by', sa.String(10), nullable=False),
        sa.Column('agent_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('agents.id', ondelete='CASCADE'), nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default=sa.text('true'), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.UniqueConstraint('name', 'agent_id', name='uq_trip_style_name_agent')
    )

    # activity_tags
    op.create_table(
        'activity_tags',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('icon', sa.String(255), nullable=True),
        sa.Column('created_by', sa.String(10), nullable=False),
        sa.Column('agent_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('agents.id', ondelete='CASCADE'), nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default=sa.text('true'), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.UniqueConstraint('name', 'agent_id', name='uq_activity_tag_name_agent')
    )

    # activity_categories
    op.create_table(
        'activity_categories',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('created_by', sa.String(10), nullable=False),
        sa.Column('agent_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('agents.id', ondelete='CASCADE'), nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default=sa.text('true'), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.UniqueConstraint('name', 'agent_id', name='uq_activity_category_name_agent')
    )

    # package_trip_styles
    op.create_table(
        'package_trip_styles',
        sa.Column('package_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('packages.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('trip_style_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('trip_styles.id', ondelete='CASCADE'), primary_key=True)
    )

    # package_activity_tags
    op.create_table(
        'package_activity_tags',
        sa.Column('package_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('packages.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('activity_tag_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('activity_tags.id', ondelete='CASCADE'), primary_key=True)
    )

    # Seed global defaults
    op.execute("""
        INSERT INTO trip_styles (name, created_by) VALUES 
        ('Adventure', 'ADMIN'), ('Leisure', 'ADMIN'), ('Cultural', 'ADMIN'), 
        ('Family', 'ADMIN'), ('Honeymoon', 'ADMIN'), ('Luxury', 'ADMIN'), 
        ('Wellness', 'ADMIN'), ('Group Tour', 'ADMIN'), ('Corporate', 'ADMIN')
    """)

    op.execute("""
        INSERT INTO activity_tags (name, created_by) VALUES 
        ('Beach', 'ADMIN'), ('Mountain', 'ADMIN'), ('Trekking', 'ADMIN'), 
        ('Heritage', 'ADMIN'), ('Nature', 'ADMIN'), ('Food & Culinary', 'ADMIN'), 
        ('City Tour', 'ADMIN'), ('Snow', 'ADMIN'), ('Pilgrimage', 'ADMIN'), 
        ('Water Sports', 'ADMIN'), ('Safari', 'ADMIN'), ('Cycling', 'ADMIN'), 
        ('Wine Tour', 'ADMIN'), ('Photography', 'ADMIN'), ('Festivals', 'ADMIN')
    """)

    op.execute("""
        INSERT INTO activity_categories (name, created_by) VALUES 
        ('Sightseeing', 'ADMIN'), ('Adventure', 'ADMIN'), ('Cultural', 'ADMIN'), 
        ('Food & Drink', 'ADMIN'), ('Beach & Water', 'ADMIN'), 
        ('Nature & Wildlife', 'ADMIN'), ('Relaxation', 'ADMIN')
    """)

def downgrade():
    op.drop_table('package_activity_tags')
    op.drop_table('package_trip_styles')
    op.drop_table('activity_categories')
    op.drop_table('activity_tags')
    op.drop_table('trip_styles')
