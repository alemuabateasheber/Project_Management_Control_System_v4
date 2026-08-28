"""add performance indexes
Revision ID: 0002_add_performance_indexes
Revises: 0001_initial
Create Date: 2026-08-21
"""
from alembic import op
import sqlalchemy as sa

revision = '0002_add_performance_indexes'
down_revision = '0001_initial'
branch_labels = None
depends_on = None

def upgrade():
    # Get connection
    conn = op.get_bind()
    
    # Check and create composite index for records: module + status + updated_at
    if not conn.dialect.has_index(conn, 'records', 'ix_records_module_status_updated_at'):
        op.create_index('ix_records_module_status_updated_at', 'records', 
                       ['module', 'status', 'updated_at'])
    
    # Check and create composite index for audit logs: user_id + created_at
    if not conn.dialect.has_index(conn, 'audit_logs', 'ix_audit_logs_user_id_created_at'):
        op.create_index('ix_audit_logs_user_id_created_at', 'audit_logs',
                       ['user_id', 'created_at'])
    
    # Check and create composite index for approvals: status + requested_at
    if not conn.dialect.has_index(conn, 'approvals', 'ix_approvals_status_requested_at'):
        op.create_index('ix_approvals_status_requested_at', 'approvals',
                       ['status', 'requested_at'])
    
    # Check and create composite index for notifications: user_id + read + created_at
    if not conn.dialect.has_index(conn, 'notifications', 'ix_notifications_user_id_read_created_at'):
        op.create_index('ix_notifications_user_id_read_created_at', 'notifications',
                       ['user_id', 'read', 'created_at'])
    
    # Check and create index on records.external_id for faster lookups during imports
    if not conn.dialect.has_index(conn, 'records', 'ix_records_external_id'):
        op.create_index('ix_records_external_id', 'records', ['external_id'])

def downgrade():
    op.drop_index('ix_records_external_id', table_name='records')
    op.drop_index('ix_notifications_user_id_read_created_at', table_name='notifications')
    op.drop_index('ix_approvals_status_requested_at', table_name='approvals')
    op.drop_index('ix_audit_logs_user_id_created_at', table_name='audit_logs')
    op.drop_index('ix_records_module_status_updated_at', table_name='records')
