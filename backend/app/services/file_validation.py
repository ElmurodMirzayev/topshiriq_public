"""Проверка размера и MIME-типа загружаемых файлов.

Все ограничения берутся из настроек (.env) — см. app/config.py.
Используется в роутере xodim до сохранения файла.
"""
from app.config import settings

# Узбекские (кириллица) названия типов для понятных ошибок пользователю.
_TYPE_LABELS = {
    "video": "Видео",
    "audio": "Аудио",
    "rasm": "Расм",
    "matn": "Ҳужжат",
}


def _limits_for(file_type: str) -> tuple[int, list[str]]:
    """Возвращает (макс. размер в байтах, список допустимых MIME) для типа файла."""
    if file_type == "video":
        return settings.MAX_VIDEO_SIZE_MB * 1024 * 1024, settings.ALLOWED_VIDEO_MIME
    if file_type == "audio":
        return settings.MAX_AUDIO_SIZE_MB * 1024 * 1024, settings.ALLOWED_AUDIO_MIME
    if file_type == "rasm":
        return settings.MAX_IMAGE_SIZE_MB * 1024 * 1024, settings.ALLOWED_IMAGE_MIME
    if file_type == "matn":
        return settings.MAX_DOCUMENT_SIZE_MB * 1024 * 1024, settings.ALLOWED_DOCUMENT_MIME
    # Неизвестный тип — запрещаем по умолчанию.
    return 0, []


def validate_file(file_type: str, content: bytes, mime_type: str | None) -> str | None:
    """Проверяет уже прочитанный файл. Возвращает текст ошибки или None, если файл корректен."""
    label = _TYPE_LABELS.get(file_type, file_type)
    max_bytes, allowed_mimes = _limits_for(file_type)

    if max_bytes <= 0 or not allowed_mimes:
        return f"{label}: файл тури қўллаб-қувватланмайди"

    # Размер
    size = len(content)
    if size == 0:
        return f"{label}: файл бўш"
    if size > max_bytes:
        max_mb = max_bytes // (1024 * 1024)
        return f"{label}: файл ҳажми {max_mb} МБ дан ошмаслиги керак"

    # MIME-тип
    mime = (mime_type or "").split(";")[0].strip().lower()
    if mime not in allowed_mimes:
        return f"{label}: файл тури рухсат этилмаган ({mime or 'номаълум'})"

    return None
