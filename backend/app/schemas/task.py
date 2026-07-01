"""Схемы поручений."""
from pydantic import BaseModel, field_validator, field_serializer
from typing import Optional
from datetime import datetime, timezone

class TaskCreate(BaseModel):
    name: str
    description: str
    report_format: list[str]
    deadline: datetime

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v): 
        if not v.strip(): raise ValueError("Номини киритинг")
        return v.strip()

    @field_validator("description")
    @classmethod
    def desc_not_empty(cls, v):
        if not v.strip(): raise ValueError("Мазмунини киритинг")
        return v.strip()

    @field_validator("report_format")
    @classmethod
    def rf_not_empty(cls, v):
        if not v: raise ValueError("Камида битта ҳисобот шакли танланиши керак")
        allowed = {"video", "audio", "rasm", "matn"}
        for item in v:
            if item not in allowed: raise ValueError(f"Нотўғри: {item}")
        return v

    @field_validator("deadline")
    @classmethod
    def deadline_to_utc(cls, v: datetime) -> datetime:
        # Все даты хранятся в UTC и timezone-aware. Если клиент прислал
        # naive datetime (без смещения), считаем его уже в UTC; если со
        # смещением — приводим к UTC.
        if v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)
        return v.astimezone(timezone.utc)

class TaskResponse(BaseModel):
    id: int
    number: int
    name: str
    description: str
    report_format: list[str]
    deadline: datetime
    status: str
    created_by: int
    assigned_to: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    # Статистика по сдаче отчётов (для списка "Барча топшириқлар").
    total_employees: Optional[int] = None
    not_submitted_count: Optional[int] = None

    @field_serializer("created_at", "deadline", "updated_at")
    def serialize_dt(self, value: Optional[datetime], _info) -> Optional[str]:
        if value is None: return None
        if value.tzinfo is None: value = value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    class Config:
        from_attributes = True

class TaskListResponse(BaseModel):
    tasks: list[TaskResponse]
    total: int
