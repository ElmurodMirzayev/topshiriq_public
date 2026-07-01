"""Абстракция хранилища файлов отчётов.

Поддерживает два бэкенда:
  * S3-совместимое объектное хранилище (production) — если в .env заданы
    S3_BUCKET и ключи доступа (см. config.s3_enabled);
  * локальная папка `uploads` (разработка) — fallback, когда S3 не настроен.

Наружу отдаётся единый интерфейс:
  * save_bytes(content, ext, content_type) -> key   — сохранить и вернуть ключ;
  * get_url(key) -> str                              — ссылка для просмотра/скачивания;
  * delete(key)                                      — удалить объект (необязательно).

В БД (report_files.file_path) хранится именно `key`. Для локального бэкенда
key — это имя файла внутри uploads (как было раньше), поэтому старые записи
продолжают открываться без миграции данных.
"""
import os
import uuid
import boto3
from botocore.client import Config as BotoConfig
from app.config import settings

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


class _LocalStorage:
    """Локальное хранилище (папка uploads). Используется в разработке."""

    backend = "local"

    def save_bytes(self, content: bytes, ext: str, content_type: str | None) -> str:
        key = f"{uuid.uuid4().hex}{ext}"
        with open(os.path.join(UPLOAD_DIR, key), "wb") as f:
            f.write(content)
        return key

    def get_url(self, key: str) -> str:
        # Файлы отдаются статикой на /uploads (см. main.py).
        # Для совместимости со старыми абсолютными ключами берём только имя файла.
        return f"/uploads/{os.path.basename(key)}"

    def delete(self, key: str) -> None:
        try:
            os.remove(os.path.join(UPLOAD_DIR, os.path.basename(key)))
        except FileNotFoundError:
            pass


class _S3Storage:
    """S3-совместимое объектное хранилище (production)."""

    backend = "s3"

    def __init__(self):
        self._client = boto3.client(
            "s3",
            endpoint_url=settings.S3_ENDPOINT or None,
            aws_access_key_id=settings.S3_ACCESS_KEY,
            aws_secret_access_key=settings.S3_SECRET_KEY,
            region_name=settings.S3_REGION,
            config=BotoConfig(signature_version="s3v4"),
        )
        self._bucket = settings.S3_BUCKET
        self._prefix = settings.S3_PREFIX

    def save_bytes(self, content: bytes, ext: str, content_type: str | None) -> str:
        name = f"{uuid.uuid4().hex}{ext}"
        key = f"{self._prefix}/{name}" if self._prefix else name
        self._client.put_object(
            Bucket=self._bucket,
            Key=key,
            Body=content,
            ContentType=content_type or "application/octet-stream",
        )
        return key

    def get_url(self, key: str) -> str:
        # Presigned-ссылка — приватный бакет остаётся приватным,
        # но файл доступен для просмотра в течение S3_URL_EXPIRE секунд.
        return self._client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self._bucket, "Key": key},
            ExpiresIn=settings.S3_URL_EXPIRE,
        )

    def delete(self, key: str) -> None:
        self._client.delete_object(Bucket=self._bucket, Key=key)


def _build_storage():
    if settings.s3_enabled:
        return _S3Storage()
    return _LocalStorage()


# Единственный экземпляр хранилища на процесс.
storage = _build_storage()
