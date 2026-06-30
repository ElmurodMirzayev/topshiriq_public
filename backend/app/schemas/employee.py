"""
Pydantic-схемы для сотрудников.
"""

from pydantic import BaseModel, field_validator, field_serializer
from typing import Optional
from datetime import datetime, timezone
from app.utils.helpers import normalize_phone

# Районы и города Қашқадарё вилояти (алфавитный порядок)
KASHKADARYO_REGIONS = [
    "Ғузор тумани",
    "Деҳқонобод тумани",
    "Қамаши тумани",
    "Қарши тумани",
    "Қарши шаҳри",
    "Касби тумани",
    "Китоб тумани",
    "Косон тумани",
    "Миришкор тумани",
    "Муборак тумани",
    "Нишон тумани",
    "Чироқчи тумани",
    "Шаҳрисабз тумани",
    "Шаҳрисабз шаҳри",
    "Яккабоғ тумани",
]


class EmployeeCreate(BaseModel):
    """Создание сотрудника."""
    full_name: str
    region: str
    position: str
    phone_number: str

    @field_validator("full_name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Ф.И.О. бўш бўлиши мумкин эмас")
        return v.strip()

    @field_validator("region")
    @classmethod
    def region_valid(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Ҳудуд танланиши шарт")
        if v.strip() not in KASHKADARYO_REGIONS:
            raise ValueError("Нотўғри ҳудуд танланган")
        return v.strip()

    @field_validator("position")
    @classmethod
    def position_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Лавозим бўш бўлиши мумкин эмас")
        return v.strip()

    @field_validator("phone_number")
    @classmethod
    def phone_valid(cls, v: str) -> str:
        digits = normalize_phone(v)
        if len(digits) < 9:
            raise ValueError("Телефон рақами нотўғри")
        return digits


class EmployeeResponse(BaseModel):
    """Ответ с данными сотрудника."""
    id: int
    full_name: str
    region: str
    position: str
    phone_number: str
    telegram_user_id: Optional[int] = None
    role: str
    is_active: bool
    created_at: datetime
    created_by_admin_id: int

    @field_serializer("created_at")
    def serialize_dt(self, value: Optional[datetime], _info) -> Optional[str]:
        if value is None:
            return None
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    class Config:
        from_attributes = True


class EmployeeListResponse(BaseModel):
    """Список сотрудников."""
    employees: list[EmployeeResponse]
    total: int


class EmployeeUpdate(BaseModel):
    """Обновление сотрудника."""
    full_name: Optional[str] = None
    region: Optional[str] = None
    position: Optional[str] = None
    phone_number: Optional[str] = None
    is_active: Optional[bool] = None

    @field_validator("full_name")
    @classmethod
    def name_not_empty(cls, v):
        if v is not None and not v.strip():
            raise ValueError("Ф.И.О. бўш бўлиши мумкин эмас")
        return v.strip() if v else v

    @field_validator("region")
    @classmethod
    def region_valid(cls, v):
        if v is not None:
            if not v.strip():
                raise ValueError("Ҳудуд танланиши шарт")
            if v.strip() not in KASHKADARYO_REGIONS:
                raise ValueError("Нотўғри ҳудуд танланган")
            return v.strip()
        return v

    @field_validator("position")
    @classmethod
    def position_not_empty(cls, v):
        if v is not None and not v.strip():
            raise ValueError("Лавозим бўш бўлиши мумкин эмас")
        return v.strip() if v else v

    @field_validator("phone_number")
    @classmethod
    def phone_valid(cls, v):
        if v is not None:
            digits = normalize_phone(v)
            if len(digits) < 9:
                raise ValueError("Телефон рақами нотўғри")
            return digits
        return v
