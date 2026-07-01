"""Роутер Admin — сотрудники."""
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.employee import EmployeeCreate, EmployeeResponse, EmployeeListResponse, EmployeeUpdate
from app.services.employee_service import EmployeeService
from app.utils.telegram import validate_init_data, get_user_role

router = APIRouter(prefix="/api/admin", tags=["admin"])

def get_admin_user(x_telegram_init_data: str = Header(..., alias="X-Telegram-Init-Data"), db: Session = Depends(get_db)) -> dict:
    user_data = validate_init_data(x_telegram_init_data)
    if not user_data: raise HTTPException(status_code=401, detail="Не авторизован")
    tid = user_data.get("id")
    role = get_user_role(db, tid)
    if role != "admin": raise HTTPException(status_code=403, detail="Фақат Admin рухсат берилган")
    return {"telegram_id": tid, "role": role, **user_data}

@router.get("/employees", response_model=EmployeeListResponse)
def get_employees(skip: int = 0, limit: int = 100, current_user: dict = Depends(get_admin_user), db: Session = Depends(get_db)):
    employees = EmployeeService.get_all_employees(db, skip=skip, limit=limit)
    total = EmployeeService.get_employees_count(db)
    return EmployeeListResponse(employees=[EmployeeResponse.model_validate(e) for e in employees], total=total)

@router.post("/employees", response_model=EmployeeResponse, status_code=201)
def create_employee(data: EmployeeCreate, current_user: dict = Depends(get_admin_user), db: Session = Depends(get_db)):
    if EmployeeService.phone_exists(db, data.phone_number):
        raise HTTPException(status_code=409, detail="Бу телефон рақами билан ходим аллақачон рўйхатдан ўтган")
    employee = EmployeeService.create_employee(db=db, data=data, admin_telegram_id=current_user["telegram_id"])
    return EmployeeResponse.model_validate(employee)

@router.get("/employees/{eid}", response_model=EmployeeResponse)
def get_employee(eid: int, current_user: dict = Depends(get_admin_user), db: Session = Depends(get_db)):
    emp = EmployeeService.get_employee_by_id(db, eid)
    if not emp: raise HTTPException(status_code=404, detail="Ходим топилмади")
    return EmployeeResponse.model_validate(emp)

@router.put("/employees/{eid}", response_model=EmployeeResponse)
def update_employee(eid: int, data: EmployeeUpdate, current_user: dict = Depends(get_admin_user), db: Session = Depends(get_db)):
    if data.phone_number and EmployeeService.phone_exists(db, data.phone_number, exclude_id=eid):
        raise HTTPException(status_code=409, detail="Бу телефон рақами билан ходим аллақачон рўйхатдан ўтган")
    emp = EmployeeService.update_employee(db, eid, data)
    if not emp: raise HTTPException(status_code=404, detail="Ходим топилмади")
    return EmployeeResponse.model_validate(emp)

@router.delete("/employees/{eid}")
def delete_employee(eid: int, current_user: dict = Depends(get_admin_user), db: Session = Depends(get_db)):
    if not EmployeeService.delete_employee(db, eid):
        raise HTTPException(status_code=404, detail="Ходим топилмади")
    return {"detail": "Ходим ўчирилди"}
