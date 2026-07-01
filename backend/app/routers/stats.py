"""Роутер статистики (раздел «Статистика» для boshliq/admin).

Тонкий: только проверка роли, валидация периода и вызов StatsService.
"""
from fastapi import APIRouter, Depends, HTTPException, Header, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.stats_service import StatsService, PERIOD_DAYS
from app.utils.telegram import validate_init_data, get_user_role

router = APIRouter(prefix="/api/stats", tags=["stats"])


def get_stats_user(
    x_telegram_init_data: str = Header(..., alias="X-Telegram-Init-Data"),
    db: Session = Depends(get_db),
) -> dict:
    """Доступ к статистике — только boshliq/admin (та же схема, что в tasks.py)."""
    user_data = validate_init_data(x_telegram_init_data)
    if not user_data:
        raise HTTPException(401, "Не авторизован")
    tid = user_data.get("id")
    role = get_user_role(db, tid)
    if role not in ("boshliq", "admin"):
        raise HTTPException(403, "Рухсат йўқ")
    return {"telegram_id": tid, "role": role, **user_data}


def _validate_period(period: str) -> str:
    if period not in PERIOD_DAYS:
        raise HTTPException(400, "Нотўғри давр")
    return period


@router.get("/summary")
def get_summary(
    period: str = Query(...),
    current_user: dict = Depends(get_stats_user),
    db: Session = Depends(get_db),
):
    _validate_period(period)
    return StatsService.get_summary(db, period)


@router.get("/timeline")
def get_timeline(
    period: str = Query(...),
    current_user: dict = Depends(get_stats_user),
    db: Session = Depends(get_db),
):
    _validate_period(period)
    return StatsService.get_timeline(db, period)
