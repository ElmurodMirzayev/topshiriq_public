"""Схемы пользователей."""
from pydantic import BaseModel
from typing import Optional

class UserInfo(BaseModel):
    telegram_id: int
    username: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: str
    employee_id: Optional[int] = None
    full_name: Optional[str] = None
    needs_phone_verification: bool = False

    class Config:
        from_attributes = True
