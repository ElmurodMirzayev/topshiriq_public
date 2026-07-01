"""Модель поручения."""
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, JSON
from app.database.connection import Base

def utc_now():
    return datetime.now(timezone.utc)

class Task(Base):
    __tablename__ = "tasks"
    id = Column(Integer, primary_key=True, autoincrement=True)
    number = Column(Integer, nullable=False)
    name = Column(String(500), nullable=False)
    description = Column(Text, nullable=False)
    report_format = Column(JSON, nullable=False)
    deadline = Column(DateTime(timezone=True), nullable=False)
    status = Column(String(50), default="yangi")
    created_by = Column(Integer, nullable=False)
    assigned_to = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), onupdate=utc_now)
