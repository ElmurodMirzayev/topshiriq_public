"""Схемы назначений."""
from pydantic import BaseModel, field_serializer
from typing import Optional
from datetime import datetime, timezone

def _ser_dt(v):
    if v is None: return None
    if v.tzinfo is None: v = v.replace(tzinfo=timezone.utc)
    return v.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

class AssignmentEmployeeInfo(BaseModel):
    employee_id: int
    employee_name: str
    employee_region: str
    employee_position: str
    status: str
    accepted_at: Optional[datetime] = None
    reported_at: Optional[datetime] = None

    @field_serializer("accepted_at", "reported_at")
    def ser(self, v, _info): return _ser_dt(v)

class TaskStats(BaseModel):
    total_employees: int
    accepted_count: int
    reported_count: int

class TaskDetailResponse(BaseModel):
    id: int
    number: int
    name: str
    description: str
    report_format: list[str]
    deadline: datetime
    status: str
    created_by: int
    created_at: datetime
    stats: TaskStats
    assignments: list[AssignmentEmployeeInfo]

    @field_serializer("created_at", "deadline")
    def ser(self, v, _info): return _ser_dt(v)

class XodimTaskItem(BaseModel):
    id: int
    number: int
    name: str
    description: str
    deadline: datetime
    status: str
    created_at: datetime
    my_status: str  # none | accepted | reported
    accepted_at: Optional[datetime] = None
    reported_at: Optional[datetime] = None

    @field_serializer("created_at", "deadline", "accepted_at", "reported_at")
    def ser(self, v, _info): return _ser_dt(v)
