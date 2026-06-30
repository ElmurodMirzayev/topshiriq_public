"""Сервис отчётов."""
import os, json
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from fastapi import UploadFile, HTTPException
from app.models.report import Report, ReportFile
from app.models.task_assignment import TaskAssignment
from app.services.storage import storage
from app.services.file_validation import validate_file


class ReportService:
    @staticmethod
    async def save_file(file: UploadFile, file_type: str) -> dict:
        """Читает, валидирует и сохраняет файл в хранилище (S3 или локально).

        В file_path сохраняется КЛЮЧ объекта (для S3 — ключ в бакете,
        для локального хранилища — имя файла в uploads).
        """
        content = await file.read()

        # Проверка размера и MIME-типа до сохранения.
        error = validate_file(file_type, content, file.content_type)
        if error:
            raise HTTPException(400, error)

        ext = os.path.splitext(file.filename or "file")[1] or ".bin"
        key = storage.save_bytes(content, ext, file.content_type)
        return {"file_type": file_type, "file_name": file.filename or "file",
            "file_path": key, "file_size": len(content), "mime_type": file.content_type}

    @staticmethod
    async def create_report(db: Session, task_id: int, employee_id: int,
                            assignment_id: int, comment: str,
                            upload_files: list[UploadFile], file_types_json: str) -> Report:
        types_list = json.loads(file_types_json) if file_types_json else []

        # Сначала валидируем и сохраняем все файлы в хранилище, и только потом
        # фиксируем отчёт в БД — чтобы при ошибке валидации не оставалось
        # «пустого» отчёта без файлов.
        saved = []
        for i, uf in enumerate(upload_files):
            ft = types_list[i] if i < len(types_list) else "unknown"
            saved.append(await ReportService.save_file(uf, ft))

        report = Report(task_id=task_id, employee_id=employee_id,
            assignment_id=assignment_id, comment=comment or None)
        db.add(report); db.commit(); db.refresh(report)

        for info in saved:
            db.add(ReportFile(report_id=report.id, **info))
        db.commit()

        # Новый отчёт сохранён успешно — удаляем предыдущие отчёты этого
        # сотрудника по этому поручению вместе с их файлами в хранилище,
        # чтобы не копился мусор при переотправке (rework -> reported).
        ReportService._cleanup_old_reports(db, task_id, employee_id, keep_id=report.id)

        # Update assignment status — новый отчёт начинает новый цикл проверки.
        a = db.query(TaskAssignment).filter(TaskAssignment.id == assignment_id).first()
        if a:
            a.status = "reported"
            a.reported_at = datetime.now(timezone.utc)
            a.reviewed_at = None
            a.review_comment = None
        db.commit()
        return report

    @staticmethod
    def _cleanup_old_reports(db: Session, task_id: int, employee_id: int, keep_id: int) -> None:
        """Удаляет старые отчёты (кроме keep_id) и их файлы из хранилища."""
        old_reports = db.query(Report).filter(
            Report.task_id == task_id,
            Report.employee_id == employee_id,
            Report.id != keep_id,
        ).all()
        for rep in old_reports:
            old_files = db.query(ReportFile).filter(ReportFile.report_id == rep.id).all()
            for f in old_files:
                # Ошибку удаления объекта в хранилище игнорируем, чтобы не
                # ломать пользовательский запрос из-за «висящего» файла.
                try:
                    storage.delete(f.file_path)
                except Exception:
                    pass
                db.delete(f)
            db.delete(rep)
        db.commit()

    @staticmethod
    def get_report(db: Session, task_id: int, employee_id: int) -> dict | None:
        report = db.query(Report).filter(
            Report.task_id == task_id, Report.employee_id == employee_id
        ).order_by(Report.created_at.desc()).first()
        if not report: return None
        files = db.query(ReportFile).filter(ReportFile.report_id == report.id).all()
        return {
            "id": report.id, "comment": report.comment,
            "created_at": report.created_at.isoformat() if report.created_at else None,
            "files": [{"id": f.id, "file_type": f.file_type, "file_name": f.file_name,
                "file_path": f.file_path, "file_size": f.file_size, "mime_type": f.mime_type,
                # Готовая ссылка для просмотра/скачивания: presigned-URL для S3
                # или /uploads/<имя> для локального хранилища.
                "file_url": storage.get_url(f.file_path)}
                for f in files]
        }
