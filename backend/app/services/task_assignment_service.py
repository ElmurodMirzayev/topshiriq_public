"""Сервис назначений."""
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import func as sql_func
from app.models.task_assignment import TaskAssignment
from app.models.employee import Employee
from app.models.task import Task

class TaskAssignmentService:
    @staticmethod
    def accept_task(db: Session, task_id: int, employee_id: int) -> TaskAssignment:
        existing = db.query(TaskAssignment).filter(
            TaskAssignment.task_id == task_id, TaskAssignment.employee_id == employee_id
        ).first()
        if existing:
            if existing.status == "pending":
                existing.status = "accepted"
                existing.accepted_at = datetime.now(timezone.utc)
                db.commit(); db.refresh(existing)
            return existing

        a = TaskAssignment(task_id=task_id, employee_id=employee_id,
            status="accepted", accepted_at=datetime.now(timezone.utc))
        db.add(a); db.commit(); db.refresh(a)
        return a

    @staticmethod
    def submit_report(db: Session, task_id: int, employee_id: int) -> TaskAssignment | None:
        a = db.query(TaskAssignment).filter(
            TaskAssignment.task_id == task_id, TaskAssignment.employee_id == employee_id
        ).first()
        # Отчёт можно отправить впервые (accepted) или повторно после доработки (rework).
        if not a or a.status not in ("accepted", "rework"):
            return None
        a.status = "reported"
        a.reported_at = datetime.now(timezone.utc)
        db.commit(); db.refresh(a)
        return a

    @staticmethod
    def approve_report(db: Session, task_id: int, employee_id: int) -> TaskAssignment | None:
        """Руководитель принимает отчёт (Қабул қилиш)."""
        a = db.query(TaskAssignment).filter(
            TaskAssignment.task_id == task_id, TaskAssignment.employee_id == employee_id
        ).first()
        # Принять можно только присланный и ещё не рассмотренный отчёт.
        if not a or a.status != "reported":
            return None
        a.status = "approved"
        a.reviewed_at = datetime.now(timezone.utc)
        a.review_comment = None
        db.commit(); db.refresh(a)
        return a

    @staticmethod
    def request_rework(db: Session, task_id: int, employee_id: int, comment: str) -> TaskAssignment | None:
        """Руководитель отправляет отчёт на доработку (Қайта ишлашга юбориш)."""
        a = db.query(TaskAssignment).filter(
            TaskAssignment.task_id == task_id, TaskAssignment.employee_id == employee_id
        ).first()
        if not a or a.status != "reported":
            return None
        a.status = "rework"
        a.reviewed_at = datetime.now(timezone.utc)
        a.review_comment = comment
        db.commit(); db.refresh(a)
        return a

    @staticmethod
    def get_my_status(db: Session, task_id: int, employee_id: int) -> dict:
        a = db.query(TaskAssignment).filter(
            TaskAssignment.task_id == task_id, TaskAssignment.employee_id == employee_id
        ).first()
        if not a:
            return {"status": "none", "accepted_at": None, "reported_at": None,
                    "reviewed_at": None, "review_comment": None}
        return {"status": a.status, "accepted_at": a.accepted_at, "reported_at": a.reported_at,
                "reviewed_at": a.reviewed_at, "review_comment": a.review_comment}

    @staticmethod
    def get_task_stats(db: Session, task_id: int) -> dict:
        total = db.query(sql_func.count(Employee.id)).filter(Employee.is_active == True).scalar() or 0
        # Принявшие поручение — все, кто прошёл стадию pending.
        accepted = db.query(sql_func.count(TaskAssignment.id)).filter(
            TaskAssignment.task_id == task_id,
            TaskAssignment.status.in_(["accepted", "reported", "approved", "rework"])
        ).scalar() or 0
        # Ожидают проверки руководителем.
        reported = db.query(sql_func.count(TaskAssignment.id)).filter(
            TaskAssignment.task_id == task_id, TaskAssignment.status == "reported"
        ).scalar() or 0
        # Приняты руководителем.
        approved = db.query(sql_func.count(TaskAssignment.id)).filter(
            TaskAssignment.task_id == task_id, TaskAssignment.status == "approved"
        ).scalar() or 0
        # Сдали отчёт хоть раз (на проверке, принят или на доработке).
        submitted = db.query(sql_func.count(TaskAssignment.id)).filter(
            TaskAssignment.task_id == task_id,
            TaskAssignment.status.in_(["reported", "approved", "rework"])
        ).scalar() or 0
        # Ещё не сдали отчёт (pending + accepted + те, у кого нет записи назначения).
        not_submitted = max(total - submitted, 0)
        return {"total_employees": total, "accepted_count": accepted,
                "reported_count": reported, "approved_count": approved,
                "submitted_count": submitted, "not_submitted_count": not_submitted}

    @staticmethod
    def get_task_assignments_with_employees(db: Session, task_id: int) -> list[dict]:
        employees = db.query(Employee).filter(Employee.is_active == True).order_by(Employee.full_name).all()
        result = []
        for emp in employees:
            a = db.query(TaskAssignment).filter(
                TaskAssignment.task_id == task_id, TaskAssignment.employee_id == emp.id
            ).first()
            result.append({
                "employee_id": emp.id, "employee_name": emp.full_name,
                "employee_region": emp.region, "employee_position": emp.position,
                "status": a.status if a else "pending",
                "accepted_at": a.accepted_at if a else None,
                "reported_at": a.reported_at if a else None,
                "reviewed_at": a.reviewed_at if a else None,
                "review_comment": a.review_comment if a else None,
            })
        return result
