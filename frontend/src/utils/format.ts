// Единое форматирование даты/времени: DD/MM/YYYY, HH:MM.
// Раньше эта функция дублировалась почти в каждом компоненте.
export function formatDateTime(value?: string | null): string {
  if (!value) return '—';
  const dt = new Date(value);
  const dd = String(dt.getDate()).padStart(2, '0');
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const hh = String(dt.getHours()).padStart(2, '0');
  const mi = String(dt.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${dt.getFullYear()}, ${hh}:${mi}`;
}

// Размер файла в человекочитаемом виде.
export function formatFileSize(bytes: number): string {
  return bytes > 1048576
    ? `${(bytes / 1048576).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

// Время в часах → "N соат" (до суток) или "N кун N соат" (от суток).
// null/undefined (нет данных) → "—".
export function formatReviewTime(hours?: number | null): string {
  if (hours == null) return '—';
  if (hours < 24) {
    const h = Math.round(hours * 10) / 10;
    return `${h} соат`;
  }
  const days = Math.floor(hours / 24);
  const rem = Math.round(hours - days * 24);
  return rem > 0 ? `${days} кун ${rem} соат` : `${days} кун`;
}
