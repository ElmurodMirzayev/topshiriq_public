"""Окружение Alembic.

URL базы берётся из settings.DATABASE_URL (.env). target_metadata собирается
из Base + всех моделей, что позволяет использовать `alembic revision --autogenerate`
для автоматического создания будущих миграций.
"""
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from alembic import context

# Единый источник конфигурации БД.
from app.config import settings
from app.database.connection import Base

# Импортируем все модели, чтобы они зарегистрировались в Base.metadata
# (необходимо для autogenerate).
from app.models import task, user, employee, task_assignment, report  # noqa: F401

config = context.config

# Подставляем URL из настроек приложения (а не из alembic.ini).
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Миграции в offline-режиме (генерация SQL без подключения)."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        compare_server_default=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Миграции в online-режиме (с реальным подключением к БД)."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            compare_server_default=True,
            # Для SQLite (локальная разработка) включаем batch-режим,
            # чтобы ALTER-операции работали корректно.
            render_as_batch=connection.dialect.name == "sqlite",
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
