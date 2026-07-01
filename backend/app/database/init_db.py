"""Инициализация БД через Alembic.

Ручные ALTER TABLE убраны. Схема приводится к актуальному состоянию
исключительно миграциями Alembic (`alembic upgrade head`), которые
запускаются автоматически при старте приложения.

Все будущие изменения структуры БД выполняются ТОЛЬКО через Alembic:
    alembic revision --autogenerate -m "описание"
    alembic upgrade head
"""
import os

from alembic import command
from alembic.config import Config


def _alembic_config() -> Config:
    # Конфиг собирается ПРОГРАММНО, без чтения alembic.ini. Это важно для
    # Windows: там Alembic читает .ini системной кодировкой (cp1252) и падал
    # бы на любых не-ASCII символах. URL берётся из settings (через env.py),
    # script_location указываем явно.
    backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    cfg = Config()  # без файла -> config_file_name=None, env.py пропустит fileConfig
    cfg.set_main_option("script_location", os.path.join(backend_dir, "alembic"))
    return cfg


def init_database():
    """Применяет все непринятые миграции до последней версии (head)."""
    command.upgrade(_alembic_config(), "head")
    print("✅ БД инициализирована (alembic upgrade head)")
