"""
Модель сотрудника (ходим).
"""

from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, Boolean
from app.database.connection import Base


def utc_now():
    return datetime.now(timezone.utc)


class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, autoincrement=True)
    full_name = Column(String(500), nullable=False)
    region = Column(String(255), nullable=False)           # Ҳудуд
    position = Column(String(255), nullable=False)         # Лавозим
    phone_number = Column(String(20), unique=True, nullable=False, index=True)
    telegram_user_id = Column(Integer, unique=True, nullable=True, index=True)
    role = Column(String(50), default="xodim")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    created_by_admin_id = Column(Integer, nullable=False)

    def __repr__(self):
        return f"<Employee(id={self.id}, name={self.full_name}, region={self.region})>"
