"""Роутер поручений."""
from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.employee import Employee
from app.services.task_service import TaskService
from app.services.task_assignment_service import TaskAssignmentService
from app.services.report_service import ReportService
from app.schemas.task import TaskCreate, TaskResponse, TaskListResponse
from app.utils.telegram import validate_init_data, get_user_role

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


class ReworkRequest(BaseModel):
    comment: str

def get_current_user(x_telegram_init_data: str = Header(..., alias="X-Telegram-Init-Data"), db: Session = Depends(get_db)) -> dict:
    user_data = validate_init_data(x_telegram_init_data)
    if not user_data: raise HTTPException(401, "Не авторизован")
    tid = user_data.get("id")
    return {"telegram_id": tid, "role": get_user_role(db, tid), **user_data}

@router.get("", response_model=TaskListResponse)
def get_tasks(skip: int = 0, limit: int = 100, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user["role"] not in ("boshliq", "admin"): raise HTTPException(403, "Рухсат йўқ")
    tasks = TaskService.get_all_tasks(db, skip=skip, limit=limit)
    total = TaskService.get_tasks_count(db)
    items = []
    for t in tasks:
        resp = TaskResponse.model_validate(t)
        stats = TaskAssignmentService.get_task_stats(db, t.id)
        resp.total_employees = stats["total_employees"]
        resp.not_submitted_count = stats["not_submitted_count"]
        items.append(resp)
    return TaskListResponse(tasks=items, total=total)

@router.post("", response_model=TaskResponse, status_code=201)
def create_task(task_data: TaskCreate, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user["role"] != "boshliq": raise HTTPException(403, "Фақат Бошлиқ")
    return TaskResponse.model_validate(TaskService.create_task(db=db, task_data=task_data, created_by=current_user["telegram_id"]))

@router.get("/{task_id}/detail")
def get_task_detail(task_id: int, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user["role"] not in ("boshliq", "admin"): raise HTTPException(403, "Рухсат йўқ")
    task = TaskService.get_task_by_id(db, task_id)
    if not task: raise HTTPException(404, "Топилмади")
    stats = TaskAssignmentService.get_task_stats(db, task_id)
    assignments = TaskAssignmentService.get_task_assignments_with_employees(db, task_id)
    return {"id": task.id, "number": task.number, "name": task.name, "description": task.description,
        "report_format": task.report_format,
        "deadline": task.deadline.isoformat() if task.deadline else None,
        "status": task.status, "created_at": task.created_at.isoformat() if task.created_at else None,
        "created_by": task.created_by, "stats": stats,
        "assignments": [{ **a,
            "accepted_at": a["accepted_at"].isoformat() if a["accepted_at"] else None,
            "reported_at": a["reported_at"].isoformat() if a["reported_at"] else None,
            "reviewed_at": a["reviewed_at"].isoformat() if a.get("reviewed_at") else None,
        } for a in assignments]}

@router.get("/{task_id}/report/{employee_id}")
def get_employee_report(task_id: int, employee_id: int, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """Просмотр отчёта конкретного сотрудника."""
    if current_user["role"] not in ("boshliq", "admin"): raise HTTPException(403, "Рухсат йўқ")
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp: raise HTTPException(404, "Ходим топилмади")
    report = ReportService.get_report(db, task_id, employee_id)
    if not report: raise HTTPException(404, "Ҳисобот топилмади")
    ms = TaskAssignmentService.get_my_status(db, task_id, employee_id)
    return {"employee": {"id": emp.id, "full_name": emp.full_name, "position": emp.position, "region": emp.region},
        "assignment": {"status": ms["status"],
            "accepted_at": ms["accepted_at"].isoformat() if ms["accepted_at"] else None,
            "reported_at": ms["reported_at"].isoformat() if ms["reported_at"] else None,
            "reviewed_at": ms["reviewed_at"].isoformat() if ms.get("reviewed_at") else None,
            "review_comment": ms.get("review_comment")},
        "report": report}


@router.post("/{task_id}/report/{employee_id}/approve")
def approve_report(task_id: int, employee_id: int, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """Руководитель принимает отчёт (Қабул қилиш)."""
    if current_user["role"] != "boshliq": raise HTTPException(403, "Фақат Бошлиқ")
    a = TaskAssignmentService.approve_report(db, task_id, employee_id)
    if not a: raise HTTPException(400, "Отчёт не найден или уже рассмотрен")
    return {"success": True, "status": a.status,
        "reviewed_at": a.reviewed_at.isoformat() if a.reviewed_at else None}


@router.post("/{task_id}/report/{employee_id}/rework")
def rework_report(task_id: int, employee_id: int, body: ReworkRequest,
                  current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """Руководитель отправляет отчёт на доработку (Қайта ишлашга юбориш)."""
    if current_user["role"] != "boshliq": raise HTTPException(403, "Фақат Бошлиқ")
    comment = (body.comment or "").strip()
    if not comment: raise HTTPException(400, "Изоҳ киритилиши шарт")
    a = TaskAssignmentService.request_rework(db, task_id, employee_id, comment)
    if not a: raise HTTPException(400, "Отчёт не найден или уже рассмотрен")
    return {"success": True, "status": a.status, "review_comment": a.review_comment,
        "reviewed_at": a.reviewed_at.isoformat() if a.reviewed_at else None}
