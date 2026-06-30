"""Назначение поручения сотруднику."""
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, UniqueConstraint
from app.database.connection import Base

def utc_now():
    return datetime.now(timezone.utc)

class TaskAssignment(Base):
    __tablename__ = "task_assignments"
    __table_args__ = (UniqueConstraint("task_id", "employee_id", name="uq_task_employee"),)

    id = Column(Integer, primary_key=True, autoincrement=True)
    task_id = Column(Integer, nullable=False, index=True)
    employee_id = Column(Integer, nullable=False, index=True)
    # pending | accepted | reported | approved | rework
    status = Column(String(50), default="pending")
    accepted_at = Column(DateTime(timezone=True), nullable=True)
    reported_at = Column(DateTime(timezone=True), nullable=True)
    # Решение руководителя (Boshliq) по отчёту.
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    review_comment = Column(Text, nullable=True)  # комментарий при отправке на доработку
    created_at = Column(DateTime(timezone=True), default=utc_now)
