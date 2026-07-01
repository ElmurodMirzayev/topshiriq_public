"""Сервис поручений."""
from sqlalchemy.orm import Session
from sqlalchemy import func as sql_func
from app.models.task import Task
from app.schemas.task import TaskCreate

class TaskService:
    @staticmethod
    def get_next_number(db: Session) -> int:
        max_n = db.query(sql_func.max(Task.number)).scalar()
        return (max_n or 0) + 1

    @staticmethod
    def create_task(db: Session, task_data: TaskCreate, created_by: int) -> Task:
        t = Task(number=TaskService.get_next_number(db), name=task_data.name,
            description=task_data.description, report_format=task_data.report_format,
            deadline=task_data.deadline, status="yangi", created_by=created_by)
        db.add(t); db.commit(); db.refresh(t)
        return t

    @staticmethod
    def get_all_tasks(db: Session, skip=0, limit=100):
        return db.query(Task).order_by(Task.created_at.desc()).offset(skip).limit(limit).all()

    @staticmethod
    def get_tasks_count(db: Session) -> int:
        return db.query(sql_func.count(Task.id)).scalar() or 0

    @staticmethod
    def get_task_by_id(db: Session, task_id: int):
        return db.query(Task).filter(Task.id == task_id).first()
