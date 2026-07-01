"""Роутер аутентификации."""
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.auth_service import AuthService
from app.schemas.user import UserInfo

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/login", response_model=UserInfo)
def login(x_telegram_init_data: str = Header(..., alias="X-Telegram-Init-Data"), db: Session = Depends(get_db)):
    user = AuthService.authenticate_user(x_telegram_init_data, db)
    if not user: raise HTTPException(status_code=401, detail="Аутентификация не удалась")
    return user

@router.get("/me", response_model=UserInfo)
def get_me(x_telegram_init_data: str = Header(..., alias="X-Telegram-Init-Data"), db: Session = Depends(get_db)):
    user = AuthService.authenticate_user(x_telegram_init_data, db)
    if not user: raise HTTPException(status_code=401, detail="Не авторизован")
    return user

@router.get("/check-binding")
def check_binding(x_telegram_init_data: str = Header(..., alias="X-Telegram-Init-Data"), db: Session = Depends(get_db)):
    """Опрашивается фронтендом после отправки контакта.

    Роль (boshliq/admin/xodim) уже определена ботом по номеру телефона и
    сохранена в БД, поэтому достаточно переиспользовать обычную авторизацию
    по Telegram ID.
    """
    user = AuthService.authenticate_user(x_telegram_init_data, db)
    if not user: raise HTTPException(status_code=401, detail="Не авторизован")
    if user.get("needs_phone_verification") or user["role"] == "unknown":
        return {"bound": False}
    return {"bound": True, **user}
