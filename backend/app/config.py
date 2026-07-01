"""Конфигурация."""
import os
from dotenv import load_dotenv
from app.utils.helpers import normalize_phone

load_dotenv()

class Settings:
    BOT_TOKEN: str = os.getenv("BOT_TOKEN", "")
    MINI_APP_URL: str = os.getenv("MINI_APP_URL", "http://localhost:3000")
    # Роли boshliq/admin определяются по номерам телефонов (а не по Telegram ID).
    # Номера нормализуются (только цифры), чтобы сравнение не зависело от формата.
    BOSHLIQ_PHONES: list[str] = [
        normalize_phone(p) for p in os.getenv("BOSHLIQ_PHONES", "").split(",") if normalize_phone(p)
    ]
    ADMIN_PHONES: list[str] = [
        normalize_phone(p) for p in os.getenv("ADMIN_PHONES", "").split(",") if normalize_phone(p)
    ]
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./tasks.db")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "change-me")
    ALGORITHM: str = "HS256"

    # Максимальный возраст initData (в секундах). По умолчанию 24 часа.
    # initData старше этого значения считается просроченной и отклоняется.
    INIT_DATA_MAX_AGE: int = int(os.getenv("INIT_DATA_MAX_AGE", "86400"))

    # Разрешённые источники (CORS). Список доменов через запятую в .env.
    # В production НЕ используем "*". По умолчанию — локальная разработка.
    ALLOWED_ORIGINS: list[str] = [
        o.strip() for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",") if o.strip()
    ]

    # ----------------------------------------------------------------------
    # S3-совместимое объектное хранилище (production-хранение файлов отчётов)
    # ----------------------------------------------------------------------
    # Если заданы S3_BUCKET и ключи доступа — файлы хранятся в S3.
    # Иначе включается локальный fallback (папка uploads) — удобно для разработки.
    S3_ENDPOINT: str = os.getenv("S3_ENDPOINT", "").strip()       # напр. https://s3.amazonaws.com или MinIO
    S3_BUCKET: str = os.getenv("S3_BUCKET", "").strip()
    S3_ACCESS_KEY: str = os.getenv("S3_ACCESS_KEY", "").strip()
    S3_SECRET_KEY: str = os.getenv("S3_SECRET_KEY", "").strip()
    S3_REGION: str = os.getenv("S3_REGION", "us-east-1").strip()
    # Префикс (папка) внутри бакета для файлов отчётов.
    S3_PREFIX: str = os.getenv("S3_PREFIX", "reports").strip().strip("/")
    # Время жизни presigned-ссылки на скачивание (в секундах). По умолчанию 1 час.
    S3_URL_EXPIRE: int = int(os.getenv("S3_URL_EXPIRE", "3600"))

    @property
    def s3_enabled(self) -> bool:
        """S3 считается включённым, если заданы бакет и оба ключа доступа."""
        return bool(self.S3_BUCKET and self.S3_ACCESS_KEY and self.S3_SECRET_KEY)

    # ----------------------------------------------------------------------
    # Ограничения на загружаемые файлы (размер в МБ + допустимые MIME-типы)
    # ----------------------------------------------------------------------
    MAX_VIDEO_SIZE_MB: int = int(os.getenv("MAX_VIDEO_SIZE_MB", "500"))
    MAX_IMAGE_SIZE_MB: int = int(os.getenv("MAX_IMAGE_SIZE_MB", "20"))
    MAX_AUDIO_SIZE_MB: int = int(os.getenv("MAX_AUDIO_SIZE_MB", "50"))
    MAX_DOCUMENT_SIZE_MB: int = int(os.getenv("MAX_DOCUMENT_SIZE_MB", "100"))

    ALLOWED_VIDEO_MIME: list[str] = [
        m.strip().lower() for m in os.getenv(
            "ALLOWED_VIDEO_MIME",
            "video/mp4,video/quicktime,video/x-msvideo,video/x-matroska,video/webm,video/3gpp"
        ).split(",") if m.strip()
    ]
    ALLOWED_IMAGE_MIME: list[str] = [
        m.strip().lower() for m in os.getenv(
            "ALLOWED_IMAGE_MIME",
            "image/jpeg,image/png,image/webp,image/heic,image/heif,image/gif"
        ).split(",") if m.strip()
    ]
    ALLOWED_AUDIO_MIME: list[str] = [
        m.strip().lower() for m in os.getenv(
            "ALLOWED_AUDIO_MIME",
            "audio/mpeg,audio/mp4,audio/aac,audio/ogg,audio/wav,audio/x-wav,audio/webm,audio/3gpp"
        ).split(",") if m.strip()
    ]
    ALLOWED_DOCUMENT_MIME: list[str] = [
        m.strip().lower() for m in os.getenv(
            "ALLOWED_DOCUMENT_MIME",
            "application/pdf,application/msword,"
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document,"
            "application/vnd.ms-excel,"
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,"
            "text/plain"
        ).split(",") if m.strip()
    ]

settings = Settings()
