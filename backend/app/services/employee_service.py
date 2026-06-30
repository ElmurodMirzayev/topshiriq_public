"""
Сервис для работы с сотрудниками.
"""

from sqlalchemy.orm import Session
from sqlalchemy import func as sql_func
from app.models.employee import Employee
from app.schemas.employee import EmployeeCreate, EmployeeUpdate
from app.utils.helpers import normalize_phone


class EmployeeService:

    @staticmethod
    def create_employee(db: Session, data: EmployeeCreate, admin_telegram_id: int) -> Employee:
        employee = Employee(
            full_name=data.full_name,
            region=data.region,
            position=data.position,
            phone_number=data.phone_number,
            role="xodim",
            is_active=True,
            created_by_admin_id=admin_telegram_id,
        )
        db.add(employee)
        db.commit()
        db.refresh(employee)
        return employee

    @staticmethod
    def get_all_employees(db: Session, skip: int = 0, limit: int = 100) -> list[Employee]:
        return (
            db.query(Employee)
            .order_by(Employee.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    @staticmethod
    def get_employees_count(db: Session) -> int:
        return db.query(sql_func.count(Employee.id)).scalar() or 0

    @staticmethod
    def get_employee_by_id(db: Session, employee_id: int) -> Employee | None:
        return db.query(Employee).filter(Employee.id == employee_id).first()

    @staticmethod
    def get_employee_by_phone(db: Session, phone: str) -> Employee | None:
        normalized = normalize_phone(phone)
        return db.query(Employee).filter(Employee.phone_number == normalized).first()

    @staticmethod
    def get_employee_by_telegram_id(db: Session, telegram_id: int) -> Employee | None:
        return db.query(Employee).filter(
            Employee.telegram_user_id == telegram_id,
            Employee.is_active == True,
        ).first()

    @staticmethod
    def phone_exists(db: Session, phone: str, exclude_id: int | None = None) -> bool:
        normalized = normalize_phone(phone)
        query = db.query(Employee).filter(Employee.phone_number == normalized)
        if exclude_id:
            query = query.filter(Employee.id != exclude_id)
        return query.first() is not None

    @staticmethod
    def bind_telegram(db: Session, phone: str, telegram_id: int) -> Employee | None:
        normalized = normalize_phone(phone)
        employee = db.query(Employee).filter(
            Employee.phone_number == normalized,
            Employee.is_active == True,
        ).first()

        if not employee:
            return None
        if employee.telegram_user_id is not None and employee.telegram_user_id != telegram_id:
            return None

        employee.telegram_user_id = telegram_id
        db.commit()
        db.refresh(employee)
        return employee

    @staticmethod
    def update_employee(db: Session, employee_id: int, data: EmployeeUpdate) -> Employee | None:
        employee = db.query(Employee).filter(Employee.id == employee_id).first()
        if not employee:
            return None

        if data.full_name is not None:
            employee.full_name = data.full_name
        if data.region is not None:
            employee.region = data.region
        if data.position is not None:
            employee.position = data.position
        if data.phone_number is not None:
            employee.phone_number = data.phone_number
        if data.is_active is not None:
            employee.is_active = data.is_active

        db.commit()
        db.refresh(employee)
        return employee

    @staticmethod
    def delete_employee(db: Session, employee_id: int) -> bool:
        employee = db.query(Employee).filter(Employee.id == employee_id).first()
        if not employee:
            return False
        employee.is_active = False
        employee.telegram_user_id = None
        db.commit()
        return True
