"""Сервис аутентификации."""
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.employee import Employee
from app.services.employee_service import EmployeeService
from app.utils.telegram import get_user_role, get_role_by_phone, validate_init_data
from app.utils.helpers import normalize_phone


class AuthService:
    @staticmethod
    def _user_payload(telegram_id, user_data, role):
        return {
            "telegram_id": telegram_id,
            "username": user_data.get("username"),
            "first_name": user_data.get("first_name"),
            "last_name": user_data.get("last_name"),
            "role": role,
            "employee_id": None,
            "full_name": None,
            "needs_phone_verification": False,
        }

    @staticmethod
    def authenticate_user(init_data: str, db: Session) -> dict | None:
        user_data = validate_init_data(init_data)
        if not user_data:
            return None
        telegram_id = user_data.get("id")
        if not telegram_id:
            return None

        # 1. boshliq/admin определяются по сохранённой в БД роли (выдаётся после
        #    верификации по номеру телефона). Повторный вход — только по Telegram ID.
        role = get_user_role(db, telegram_id)
        if role in ("boshliq", "admin"):
            return AuthService._user_payload(telegram_id, user_data, role)

        # 2. xodim — по привязанной записи сотрудника.
        employee = db.query(Employee).filter(
            Employee.telegram_user_id == telegram_id, Employee.is_active == True).first()
        if employee:
            payload = AuthService._user_payload(telegram_id, user_data, "xodim")
            payload["employee_id"] = employee.id
            payload["full_name"] = employee.full_name
            return payload

        # 3. Неизвестный пользователь — нужен ввод номера телефона.
        payload = AuthService._user_payload(telegram_id, user_data, "unknown")
        payload["needs_phone_verification"] = True
        return payload

    @staticmethod
    def bind_by_phone(db: Session, phone: str, telegram_id: int,
                      username: str | None = None,
                      first_name: str | None = None,
                      last_name: str | None = None) -> tuple[str, str] | None:
        """Определяет роль ТОЛЬКО по номеру телефона и привязывает Telegram ID.

        Порядок определения роли:
          1. номер в BOSHLIQ_PHONES (.env) -> boshliq;
          2. номер в ADMIN_PHONES (.env)   -> admin;
          3. номер найден среди сотрудников -> xodim;
          4. иначе -> доступ запрещён.

        Для boshliq/admin создаётся/обновляется запись User (с сохранением
        telegram_id, роли и телефона), чтобы при следующих входах авторизация
        проходила автоматически по Telegram ID без повторного запроса контакта.

        Возвращает (role, display_name) либо None, если доступ запрещён.
        """
        normalized = normalize_phone(phone)
        role = get_role_by_phone(normalized)  # boshliq / admin / None

        if role in ("boshliq", "admin"):
            db_user = db.query(User).filter(User.telegram_id == telegram_id).first()
            if not db_user:
                db_user = User(
                    telegram_id=telegram_id,
                    username=username,
                    first_name=first_name,
                    last_name=last_name,
                    phone_number=normalized,
                    role=role,
                )
                db.add(db_user)
            else:
                db_user.role = role
                db_user.phone_number = normalized
                db_user.username = username
                db_user.first_name = first_name
                db_user.last_name = last_name
            db.commit()
            return role, (first_name or username or "Foydalanuvchi")

        # Сотрудник (xodim) — привязка через существующий сервис.
        employee = EmployeeService.bind_telegram(db, phone, telegram_id)
        if employee:
            return "xodim", employee.full_name

        return None
