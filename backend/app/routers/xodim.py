"""Роутер Xodim."""
import json
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Header, File, UploadFile, Form
from typing import List
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.employee import Employee
from app.models.task_assignment import TaskAssignment
from app.services.task_service import TaskService
from app.services.task_assignment_service import TaskAssignmentService
from app.services.report_service import ReportService
from app.utils.telegram import validate_init_data

router = APIRouter(prefix="/api/xodim", tags=["xodim"])

def get_xodim(x_telegram_init_data: str = Header(..., alias="X-Telegram-Init-Data"), db: Session = Depends(get_db)) -> dict:
    user_data = validate_init_data(x_telegram_init_data)
    if not user_data: raise HTTPException(401, "Не авторизован")
    tid = user_data.get("id")
    emp = db.query(Employee).filter(Employee.telegram_user_id == tid, Employee.is_active == True).first()
    if not emp: raise HTTPException(403, "Ходим топилмади")
    return {"telegram_id": tid, "employee_id": emp.id, "employee": emp}

def is_deadline_passed(task) -> bool:
    """True, если срок поручения уже истёк."""
    if not task.deadline:
        return False
    deadline = task.deadline
    # Нормализуем к UTC, если дата хранится без таймзоны (SQLite).
    if deadline.tzinfo is None:
        deadline = deadline.replace(tzinfo=timezone.utc)
    return datetime.now(timezone.utc) > deadline

@router.get("/tasks")
def get_my_tasks(xodim: dict = Depends(get_xodim), db: Session = Depends(get_db)):
    tasks = TaskService.get_all_tasks(db, limit=500)
    result = []
    for t in tasks:
        ms = TaskAssignmentService.get_my_status(db, t.id, xodim["employee_id"])
        result.append({"id": t.id, "number": t.number, "name": t.name, "description": t.description,
            "deadline": t.deadline.isoformat() if t.deadline else None,
            "status": t.status, "created_at": t.created_at.isoformat() if t.created_at else None,
            "my_status": ms["status"],
            "accepted_at": ms["accepted_at"].isoformat() if ms["accepted_at"] else None,
            "reported_at": ms["reported_at"].isoformat() if ms["reported_at"] else None,
            "reviewed_at": ms["reviewed_at"].isoformat() if ms.get("reviewed_at") else None,
            "review_comment": ms.get("review_comment")})
    return {"tasks": result, "total": len(result)}

@router.get("/tasks/{task_id}")
def get_task_detail(task_id: int, xodim: dict = Depends(get_xodim), db: Session = Depends(get_db)):
    task = TaskService.get_task_by_id(db, task_id)
    if not task: raise HTTPException(404, "Топилмади")
    ms = TaskAssignmentService.get_my_status(db, task_id, xodim["employee_id"])
    return {"id": task.id, "number": task.number, "name": task.name, "description": task.description,
        "report_format": task.report_format,
        "deadline": task.deadline.isoformat() if task.deadline else None,
        "status": task.status, "created_at": task.created_at.isoformat() if task.created_at else None,
        "my_status": ms["status"],
        "accepted_at": ms["accepted_at"].isoformat() if ms["accepted_at"] else None,
        "reported_at": ms["reported_at"].isoformat() if ms["reported_at"] else None,
        "reviewed_at": ms["reviewed_at"].isoformat() if ms.get("reviewed_at") else None,
        "review_comment": ms.get("review_comment")}

@router.post("/tasks/{task_id}/accept")
def accept_task(task_id: int, xodim: dict = Depends(get_xodim), db: Session = Depends(get_db)):
    task = TaskService.get_task_by_id(db, task_id)
    if not task: raise HTTPException(404, "Топилмади")
    if is_deadline_passed(task): raise HTTPException(400, "Топшириқ муддати тугаган")
    a = TaskAssignmentService.accept_task(db, task_id, xodim["employee_id"])
    return {"success": True, "status": a.status}

@router.post("/tasks/{task_id}/submit-report")
async def submit_report(task_id: int, comment: str = Form(""), file_types: str = Form("[]"),
    files: List[UploadFile] = File(default=[]),
    xodim: dict = Depends(get_xodim), db: Session = Depends(get_db)):
    task = TaskService.get_task_by_id(db, task_id)
    if not task: raise HTTPException(404, "Топилмади")
    if is_deadline_passed(task): raise HTTPException(400, "Топшириқ муддати тугаган")

    a = db.query(TaskAssignment).filter(
        TaskAssignment.task_id == task_id, TaskAssignment.employee_id == xodim["employee_id"],
        TaskAssignment.status.in_(["accepted", "rework"])).first()
    if not a: raise HTTPException(400, "Аввал топшириқни қабул қилинг")

    # Validate required formats
    types_list = json.loads(file_types) if file_types else []
    required = set(task.report_format or [])
    provided = set(types_list)
    missing = required - provided
    if missing:
        labels = {"video": "Video", "audio": "Audio", "rasm": "Rasm", "matn": "Matn"}
        raise HTTPException(400, f"Қуйидагилар юкланмаган: {', '.join(labels.get(m, m) for m in missing)}")

    report = await ReportService.create_report(db, task_id, xodim["employee_id"], a.id, comment, files, file_types)
    return {"success": True, "report_id": report.id}
