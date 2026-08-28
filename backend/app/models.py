import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import String, DateTime, Boolean, Text, Integer, JSON

class Base(DeclarativeBase): pass

def now_utc(): return datetime.now(timezone.utc)
def uid(): return str(uuid.uuid4())

class User(Base):
    __tablename__='users'
    id: Mapped[str]=mapped_column(String(36), primary_key=True, default=uid)
    username: Mapped[str]=mapped_column(String(80), unique=True, index=True)
    full_name: Mapped[str]=mapped_column(String(160))
    password_hash: Mapped[str]=mapped_column(String(255))
    role: Mapped[str]=mapped_column(String(40), default='viewer', index=True)
    active: Mapped[bool]=mapped_column(Boolean, default=True)
    last_login: Mapped[Optional[datetime]]=mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime]=mapped_column(DateTime(timezone=True), default=now_utc)
    updated_at: Mapped[datetime]=mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

class Record(Base):
    __tablename__='records'
    id: Mapped[str]=mapped_column(String(36), primary_key=True, default=uid)
    module: Mapped[str]=mapped_column(String(120), index=True)
    external_id: Mapped[Optional[str]]=mapped_column(String(160), index=True, nullable=True)
    data: Mapped[dict]=mapped_column(JSON)
    version: Mapped[int]=mapped_column(Integer, default=1)
    status: Mapped[str]=mapped_column(String(40), default='draft', index=True)
    created_by: Mapped[str]=mapped_column(String(36))
    updated_at: Mapped[datetime]=mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

class AuditLog(Base):
    __tablename__='audit_logs'
    id: Mapped[str]=mapped_column(String(36), primary_key=True, default=uid)
    user_id: Mapped[str]=mapped_column(String(36), index=True)
    action: Mapped[str]=mapped_column(String(80), index=True)
    entity_type: Mapped[str]=mapped_column(String(80))
    entity_id: Mapped[Optional[str]]=mapped_column(String(36), nullable=True)
    before_data: Mapped[Optional[dict]]=mapped_column(JSON, nullable=True)
    after_data: Mapped[Optional[dict]]=mapped_column(JSON, nullable=True)
    ip_address: Mapped[Optional[str]]=mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime]=mapped_column(DateTime(timezone=True), default=now_utc, index=True)

class Approval(Base):
    __tablename__='approvals'
    id: Mapped[str]=mapped_column(String(36), primary_key=True, default=uid)
    record_id: Mapped[str]=mapped_column(String(36), index=True)
    requested_by: Mapped[str]=mapped_column(String(36))
    approver_role: Mapped[str]=mapped_column(String(40))
    status: Mapped[str]=mapped_column(String(30), default='pending', index=True)
    comment: Mapped[Optional[str]]=mapped_column(Text, nullable=True)
    requested_at: Mapped[datetime]=mapped_column(DateTime(timezone=True), default=now_utc)
    decided_at: Mapped[Optional[datetime]]=mapped_column(DateTime(timezone=True), nullable=True)

class ReportSchedule(Base):
    __tablename__='report_schedules'
    id: Mapped[str]=mapped_column(String(36), primary_key=True, default=uid)
    name: Mapped[str]=mapped_column(String(160))
    frequency: Mapped[str]=mapped_column(String(30), default='weekly')
    recipients: Mapped[list]=mapped_column(JSON, default=list)
    report_type: Mapped[str]=mapped_column(String(40), default='status')
    active: Mapped[bool]=mapped_column(Boolean, default=True)
    last_run: Mapped[Optional[datetime]]=mapped_column(DateTime(timezone=True), nullable=True)
    created_by: Mapped[str]=mapped_column(String(36))

class ReportRun(Base):
    __tablename__='report_runs'
    id: Mapped[str]=mapped_column(String(36), primary_key=True, default=uid)
    schedule_id: Mapped[Optional[str]]=mapped_column(String(36), nullable=True, index=True)
    report_type: Mapped[str]=mapped_column(String(40))
    format: Mapped[str]=mapped_column(String(20))
    status: Mapped[str]=mapped_column(String(30), default='completed')
    filename: Mapped[str]=mapped_column(String(255))
    created_by: Mapped[str]=mapped_column(String(36))
    created_at: Mapped[datetime]=mapped_column(DateTime(timezone=True), default=now_utc)

class Notification(Base):
    __tablename__='notifications'
    id: Mapped[str]=mapped_column(String(36), primary_key=True, default=uid)
    user_id: Mapped[str]=mapped_column(String(36), index=True)
    title: Mapped[str]=mapped_column(String(180))
    message: Mapped[str]=mapped_column(Text)
    type: Mapped[str]=mapped_column(String(40), default='info')
    read: Mapped[bool]=mapped_column(Boolean, default=False, index=True)
    created_at: Mapped[datetime]=mapped_column(DateTime(timezone=True), default=now_utc, index=True)
