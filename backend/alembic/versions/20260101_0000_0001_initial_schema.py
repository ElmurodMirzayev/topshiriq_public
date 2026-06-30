"""initial schema

Базовая (baseline) миграция, описывающая текущую полную схему БД:
users, employees, tasks, task_assignments, reports, report_files.

Идемпотентна: таблицы, которые уже существуют (например, при переносе с
ранее созданной БД), пропускаются — это обеспечивает совместимость с
существующей базой данных. На чистой PostgreSQL создаются все таблицы.

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-01-01 00:00:00
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0001_initial_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_table(name: str) -> bool:
    bind = op.get_bind()
    return sa.inspect(bind).has_table(name)


def upgrade() -> None:
    # users
    if not _has_table("users"):
        op.create_table(
            "users",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("telegram_id", sa.Integer(), nullable=False),
            sa.Column("username", sa.String(length=255), nullable=True),
            sa.Column("first_name", sa.String(length=255), nullable=True),
            sa.Column("last_name", sa.String(length=255), nullable=True),
            sa.Column("phone_number", sa.String(length=20), nullable=True),
            sa.Column("role", sa.String(length=50), nullable=False),
            sa.Column("is_active", sa.Boolean(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        )
        op.create_index("ix_users_telegram_id", "users", ["telegram_id"], unique=True)
        op.create_index("ix_users_phone_number", "users", ["phone_number"], unique=False)

    # employees
    if not _has_table("employees"):
        op.create_table(
            "employees",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("full_name", sa.String(length=500), nullable=False),
            sa.Column("region", sa.String(length=255), nullable=False),
            sa.Column("position", sa.String(length=255), nullable=False),
            sa.Column("phone_number", sa.String(length=20), nullable=False),
            sa.Column("telegram_user_id", sa.Integer(), nullable=True),
            sa.Column("role", sa.String(length=50), nullable=True),
            sa.Column("is_active", sa.Boolean(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_by_admin_id", sa.Integer(), nullable=False),
        )
        op.create_index("ix_employees_phone_number", "employees", ["phone_number"], unique=True)
        op.create_index("ix_employees_telegram_user_id", "employees", ["telegram_user_id"], unique=True)

    # tasks
    if not _has_table("tasks"):
        op.create_table(
            "tasks",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("number", sa.Integer(), nullable=False),
            sa.Column("name", sa.String(length=500), nullable=False),
            sa.Column("description", sa.Text(), nullable=False),
            sa.Column("report_format", sa.JSON(), nullable=False),
            sa.Column("deadline", sa.DateTime(timezone=True), nullable=False),
            sa.Column("status", sa.String(length=50), nullable=True),
            sa.Column("created_by", sa.Integer(), nullable=False),
            sa.Column("assigned_to", sa.Integer(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        )

    # task_assignments
    if not _has_table("task_assignments"):
        op.create_table(
            "task_assignments",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("task_id", sa.Integer(), nullable=False),
            sa.Column("employee_id", sa.Integer(), nullable=False),
            sa.Column("status", sa.String(length=50), nullable=True),
            sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("reported_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("review_comment", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
            sa.UniqueConstraint("task_id", "employee_id", name="uq_task_employee"),
        )
        op.create_index("ix_task_assignments_task_id", "task_assignments", ["task_id"], unique=False)
        op.create_index("ix_task_assignments_employee_id", "task_assignments", ["employee_id"], unique=False)

    # reports
    if not _has_table("reports"):
        op.create_table(
            "reports",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("task_id", sa.Integer(), nullable=False),
            sa.Column("employee_id", sa.Integer(), nullable=False),
            sa.Column("assignment_id", sa.Integer(), nullable=False),
            sa.Column("comment", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        )
        op.create_index("ix_reports_task_id", "reports", ["task_id"], unique=False)
        op.create_index("ix_reports_employee_id", "reports", ["employee_id"], unique=False)

    # report_files
    if not _has_table("report_files"):
        op.create_table(
            "report_files",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("report_id", sa.Integer(), nullable=False),
            sa.Column("file_type", sa.String(length=50), nullable=False),
            sa.Column("file_name", sa.String(length=500), nullable=False),
            sa.Column("file_path", sa.String(length=500), nullable=False),
            sa.Column("file_size", sa.Integer(), nullable=True),
            sa.Column("mime_type", sa.String(length=100), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        )
        op.create_index("ix_report_files_report_id", "report_files", ["report_id"], unique=False)


def downgrade() -> None:
    for table in ("report_files", "reports", "task_assignments", "tasks", "employees", "users"):
        if _has_table(table):
            op.drop_table(table)
