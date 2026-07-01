"""Сервис статистики (раздел «Статистика» для boshliq/admin).

Вся бизнес-логика статистики (диапазоны дат, агрегации, бакеты графика)
сосредоточена здесь. Роутер только проверяет роль/период и вызывает сервис.

Строки статусов ("approved", "rework", "reported") совпадают с
task_assignment_service.py и frontend/src/constants/status.ts — не дублируем
и не изобретаем новые значения.
"""
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func as sql_func
from app.models.task import Task
from app.models.report import Report
from app.models.task_assignment import TaskAssignment
from app.models.employee import Employee

# Скользящее окно периода → на сколько дней назад отступать от «сейчас».
# Единственный источник правды по периодам: и валидация, и диапазоны берут
# значения отсюда, чтобы не плодить «магические числа» по коду.
PERIOD_DAYS = {
    "1w": 7,
    "1m": 30,
    "2m": 60,
    "6m": 180,
    "1y": 365,
}

# Правило разбиения периода на бакеты графика: "day" | "week".
# Тоже в одном месте — чтобы гранулярность не хардкодилась в нескольких.
BUCKET_RULE = {
    "1w": "day",
    "1m": "day",
    "2m": "day",
    "6m": "week",
    "1y": "week",
}


class StatsService:
    @staticmethod
    def _aware(dt: datetime) -> datetime:
        """Приводит дату к aware-UTC (в SQLite даты могут быть naive)."""
        if dt.tzinfo is None:
            return dt.replace(tzinfo=timezone.utc)
        return dt

    @staticmethod
    def _range(period: str) -> tuple[datetime, datetime]:
        to_date = datetime.now(timezone.utc)
        from_date = to_date - timedelta(days=PERIOD_DAYS[period])
        return from_date, to_date

    @staticmethod
    def get_summary(db: Session, period: str) -> dict:
        from_date, to_date = StatsService._range(period)

        # Топшириқлар яратилди — задачи, созданные в диапазоне.
        total_tasks_created = db.query(sql_func.count(Task.id)).filter(
            Task.created_at >= from_date, Task.created_at <= to_date
        ).scalar() or 0

        # Ҳисоботлар топширилди — ВСЕ отчёты в диапазоне, включая переотправки
        # после доработки (реальная рабочая нагрузка, а не финальный результат).
        total_reports_submitted = db.query(sql_func.count(Report.id)).filter(
            Report.created_at >= from_date, Report.created_at <= to_date
        ).scalar() or 0

        # Приняты руководителем (решение в диапазоне).
        approved_count = db.query(sql_func.count(TaskAssignment.id)).filter(
            TaskAssignment.status == "approved",
            TaskAssignment.reviewed_at >= from_date,
            TaskAssignment.reviewed_at <= to_date,
        ).scalar() or 0

        # Отправлены на доработку (текущий статус, решение в диапазоне).
        rework_count = db.query(sql_func.count(TaskAssignment.id)).filter(
            TaskAssignment.status == "rework",
            TaskAssignment.reviewed_at >= from_date,
            TaskAssignment.reviewed_at <= to_date,
        ).scalar() or 0

        # Ожидают проверки прямо сейчас (отчёт пришёл в диапазоне).
        reported_count = db.query(sql_func.count(TaskAssignment.id)).filter(
            TaskAssignment.status == "reported",
            TaskAssignment.reported_at >= from_date,
            TaskAssignment.reported_at <= to_date,
        ).scalar() or 0

        # Доля доработок среди рассмотренных отчётов.
        denom = approved_count + rework_count
        rework_rate = round(rework_count / denom, 2) if denom else 0.0

        # Среднее время проверки (reviewed_at - reported_at) в часах по
        # принятым отчётам с reviewed_at в диапазоне; None, если данных нет.
        approved_assignments = db.query(TaskAssignment).filter(
            TaskAssignment.status == "approved",
            TaskAssignment.reviewed_at >= from_date,
            TaskAssignment.reviewed_at <= to_date,
        ).all()
        durations = []
        for a in approved_assignments:
            if a.reviewed_at and a.reported_at:
                delta = StatsService._aware(a.reviewed_at) - StatsService._aware(a.reported_at)
                hours = delta.total_seconds() / 3600
                if hours >= 0:
                    durations.append(hours)
        avg_review_time_hours = round(sum(durations) / len(durations), 2) if durations else None

        # Активные сотрудники — общее число, не зависит от периода (для контекста).
        active_employees_count = db.query(sql_func.count(Employee.id)).filter(
            Employee.is_active == True
        ).scalar() or 0

        # Топ-5 сотрудников по числу принятых отчётов за период.
        approved_by_emp = dict(
            db.query(TaskAssignment.employee_id, sql_func.count(TaskAssignment.id)).filter(
                TaskAssignment.status == "approved",
                TaskAssignment.reviewed_at >= from_date,
                TaskAssignment.reviewed_at <= to_date,
            ).group_by(TaskAssignment.employee_id).all()
        )
        rework_by_emp = dict(
            db.query(TaskAssignment.employee_id, sql_func.count(TaskAssignment.id)).filter(
                TaskAssignment.status == "rework",
                TaskAssignment.reviewed_at >= from_date,
                TaskAssignment.reviewed_at <= to_date,
            ).group_by(TaskAssignment.employee_id).all()
        )
        ranked = sorted(approved_by_emp, key=lambda eid: approved_by_emp[eid], reverse=True)[:5]
        names = {
            e.id: e.full_name
            for e in db.query(Employee).filter(Employee.id.in_(ranked)).all()
        } if ranked else {}
        top_employees = [
            {
                "employee_id": eid,
                "employee_name": names.get(eid, f"#{eid}"),
                "approved_count": approved_by_emp.get(eid, 0),
                "rework_count": rework_by_emp.get(eid, 0),
            }
            for eid in ranked
        ]

        return {
            "total_tasks_created": total_tasks_created,
            "total_reports_submitted": total_reports_submitted,
            "approved_count": approved_count,
            "rework_count": rework_count,
            "reported_count": reported_count,
            "rework_rate": rework_rate,
            "avg_review_time_hours": avg_review_time_hours,
            "active_employees_count": active_employees_count,
            "top_employees": top_employees,
        }

    @staticmethod
    def get_timeline(db: Session, period: str) -> list[dict]:
        from_date, to_date = StatsService._range(period)
        bucket = timedelta(days=1) if BUCKET_RULE[period] == "day" else timedelta(days=7)

        # Генерируем границы бакетов, покрывающие весь диапазон.
        buckets: list[datetime] = []
        start = from_date
        while start < to_date:
            buckets.append(start)
            start = start + bucket
        if not buckets:
            buckets.append(from_date)

        bucket_seconds = bucket.total_seconds()

        def bucket_index(dt: datetime) -> int:
            dt = StatsService._aware(dt)
            idx = int((dt - from_date).total_seconds() // bucket_seconds)
            if idx < 0:
                idx = 0
            if idx >= len(buckets):
                idx = len(buckets) - 1
            return idx

        submitted = [0] * len(buckets)
        approved = [0] * len(buckets)
        rework = [0] * len(buckets)

        # submitted — по Report.created_at.
        for r in db.query(Report).filter(
            Report.created_at >= from_date, Report.created_at <= to_date
        ).all():
            if r.created_at:
                submitted[bucket_index(r.created_at)] += 1

        # approved/rework — по TaskAssignment.reviewed_at.
        for a in db.query(TaskAssignment).filter(
            TaskAssignment.status.in_(["approved", "rework"]),
            TaskAssignment.reviewed_at >= from_date,
            TaskAssignment.reviewed_at <= to_date,
        ).all():
            if not a.reviewed_at:
                continue
            i = bucket_index(a.reviewed_at)
            if a.status == "approved":
                approved[i] += 1
            else:
                rework[i] += 1

        return [
            {
                "date": buckets[i].isoformat(),
                "submitted_count": submitted[i],
                "approved_count": approved[i],
                "rework_count": rework[i],
            }
            for i in range(len(buckets))
        ]
