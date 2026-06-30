import axios from 'axios';

// Деталь ошибки FastAPI: либо строка, либо массив ошибок валидации Pydantic.
interface ValidationItem {
  msg: string;
}

type ApiErrorDetail = string | ValidationItem[] | undefined;

// Достаёт человекочитаемое сообщение из ошибки axios/FastAPI.
// fallback используется, когда сервер не вернул понятного текста.
export function getApiErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const detail = err.response?.data?.detail as ApiErrorDetail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) return detail.map((d) => d.msg).join(', ');
  }
  return fallback;
}
