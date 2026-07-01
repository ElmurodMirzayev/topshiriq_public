"""Telegram утилиты."""
import hashlib, hmac, json, time
from urllib.parse import unquote, parse_qs
from fastapi import HTTPException
from app.config import settings
from app.utils.helpers import normalize_phone

# Сообщение об истёкшей авторизации Telegram (используется при 401).
INIT_DATA_EXPIRED = "Telegram authorization has expired. Please reopen the Mini App."

def validate_init_data(init_data: str) -> dict | None:
    try:
        parsed = parse_qs(init_data)
        received_hash = parsed.get("hash", [None])[0]
        if not received_hash:
            return None
        data_check_items = []
        for key, values in sorted(parsed.items()):
            if key == "hash":
                continue
            data_check_items.append(f"{key}={values[0]}")
        data_check_string = "\n".join(data_check_items)
        secret_key = hmac.new(b"WebAppData", settings.BOT_TOKEN.encode(), hashlib.sha256).digest()
        computed_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
        if computed_hash != received_hash:
            return None
        # Проверка срока действия: initData не должна быть старше INIT_DATA_MAX_AGE.
        # auth_date — это unix-время (в секундах) выдачи данных Telegram.
        auth_date_str = parsed.get("auth_date", [None])[0]
        if not auth_date_str or not auth_date_str.isdigit():
            return None
        age = time.time() - int(auth_date_str)
        if age > settings.INIT_DATA_MAX_AGE:
            # Подпись валидна, но данные просрочены — это отдельный, явный случай.
            raise HTTPException(status_code=401, detail=INIT_DATA_EXPIRED)
        user_data_str = parsed.get("user", [None])[0]
        if user_data_str:
            return json.loads(unquote(user_data_str))
        return None
    except HTTPException:
        # Пробрасываем 401 о просроченной авторизации дальше (не глотаем).
        raise
    except Exception:
        return None

def get_role_by_phone(phone: str) -> str | None:
    """Определяет роль boshliq/admin по номеру телефона из .env.

    Возвращает "boshliq", "admin" или None (если номер не привилегированный).
    Сравниваются только цифры номера (через normalize_phone).
    """
    normalized = normalize_phone(phone)
    if not normalized:
        return None
    if normalized in settings.BOSHLIQ_PHONES:
        return "boshliq"
    if normalized in settings.ADMIN_PHONES:
        return "admin"
    return None


def get_user_role(db, telegram_id: int) -> str:
    """Возвращает роль пользователя по Telegram ID.

    Роль boshliq/admin берётся из таблицы users (туда она попадает после
    верификации по номеру телефона). Если записи нет — роль "xodim"
    (фактическая принадлежность к сотрудникам проверяется отдельно).
    """
    from app.models.user import User
    db_user = db.query(User).filter(User.telegram_id == telegram_id).first()
    if db_user and db_user.role in ("boshliq", "admin"):
        return db_user.role
    return "xodim"
