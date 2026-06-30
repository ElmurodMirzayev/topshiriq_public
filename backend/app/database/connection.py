"""Подключение к БД."""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import settings

is_sqlite = settings.DATABASE_URL.startswith("sqlite")

connect_args = {}
engine_kwargs = {"echo": False}

if is_sqlite:
    # Только для локальной разработки.
    connect_args = {"check_same_thread": False}
else:
    # PostgreSQL (production): пул соединений с проверкой "живости".
    # pool_pre_ping снимает "висящие" соединения, pool настроен под
    # одновременную отправку отчётов несколькими сотрудниками.
    engine_kwargs.update(
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20,
        pool_recycle=1800,  # пересоздавать соединения каждые 30 минут
    )

engine = create_engine(settings.DATABASE_URL, connect_args=connect_args, **engine_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
