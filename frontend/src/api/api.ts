import axios from 'axios';
import type {
  BindingResult,
  CreateEmployeePayload,
  CreateTaskPayload,
  EmployeeListResponse,
  EmployeeReport,
  StatsPeriod,
  StatsSummary,
  StatsTimelinePoint,
  Task,
  TaskDetail,
  TaskListResponse,
  User,
  XodimTask,
  XodimTaskListResponse,
} from '../types/models';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '',
  headers: { 'Content-Type': 'application/json' },
});

function gid(): string {
  return window.Telegram?.WebApp?.initData || '';
}

api.interceptors.request.use((c) => {
  const d = gid();
  if (d) c.headers['X-Telegram-Init-Data'] = d;
  return c;
});

// ─────────────────────────────── Auth ───────────────────────────────
export async function login(initData: string): Promise<User> {
  return (await api.post<User>('/api/auth/login', null, { headers: { 'X-Telegram-Init-Data': initData } })).data;
}

export async function checkBinding(): Promise<BindingResult> {
  return (await api.get<BindingResult>('/api/auth/check-binding')).data;
}

// ───────────────────────── Tasks (Boshliq/Admin) ────────────────────
export async function getTasks(skip = 0, limit = 100): Promise<TaskListResponse> {
  return (await api.get<TaskListResponse>('/api/tasks', { params: { skip, limit } })).data;
}

export async function createTask(payload: CreateTaskPayload): Promise<Task> {
  return (await api.post<Task>('/api/tasks', payload)).data;
}

export async function getTaskDetail(id: number): Promise<TaskDetail> {
  return (await api.get<TaskDetail>(`/api/tasks/${id}/detail`)).data;
}

export async function getEmployeeReport(taskId: number, empId: number): Promise<EmployeeReport> {
  return (await api.get<EmployeeReport>(`/api/tasks/${taskId}/report/${empId}`)).data;
}

export async function approveReport(taskId: number, empId: number): Promise<unknown> {
  return (await api.post(`/api/tasks/${taskId}/report/${empId}/approve`)).data;
}

export async function reworkReport(taskId: number, empId: number, comment: string): Promise<unknown> {
  return (await api.post(`/api/tasks/${taskId}/report/${empId}/rework`, { comment })).data;
}

// ─────────────────────── Stats (Boshliq/Admin) ──────────────────────
export async function getStatsSummary(period: StatsPeriod): Promise<StatsSummary> {
  return (await api.get<StatsSummary>('/api/stats/summary', { params: { period } })).data;
}

export async function getStatsTimeline(period: StatsPeriod): Promise<StatsTimelinePoint[]> {
  return (await api.get<StatsTimelinePoint[]>('/api/stats/timeline', { params: { period } })).data;
}

// ───────────────────────── Employees (Admin) ────────────────────────
export async function getEmployees(skip = 0, limit = 100): Promise<EmployeeListResponse> {
  return (await api.get<EmployeeListResponse>('/api/admin/employees', { params: { skip, limit } })).data;
}

export async function createEmployee(payload: CreateEmployeePayload): Promise<unknown> {
  return (await api.post('/api/admin/employees', payload)).data;
}

// ─────────────────────────────── Xodim ──────────────────────────────
export async function getXodimTasks(): Promise<XodimTaskListResponse> {
  return (await api.get<XodimTaskListResponse>('/api/xodim/tasks')).data;
}

export async function getXodimTaskDetail(id: number): Promise<XodimTask> {
  return (await api.get<XodimTask>(`/api/xodim/tasks/${id}`)).data;
}

export async function acceptTask(id: number): Promise<unknown> {
  return (await api.post(`/api/xodim/tasks/${id}/accept`)).data;
}

// Sum the byte size of every Blob/File (and the rough byte length of string
// fields) in a FormData. Used as a fallback denominator for progress because
// some WebViews (notably Telegram's in-app browser) don't expose a computable
// `event.total` on XHR upload progress events.
function estimateFormDataBytes(formData: FormData): number {
  let total = 0;
  formData.forEach((value) => {
    if (value instanceof Blob) {
      total += value.size;
    } else {
      // Approximate UTF-8 byte length of string parts.
      total += new Blob([String(value)]).size;
    }
  });
  return total;
}

export async function submitReportFiles(
  id: number,
  formData: FormData,
  // Reports upload progress as a 0–100 integer. Large videos (up to 500MB) over a
  // mobile connection can take a while, so callers can show a live progress bar.
  onProgress?: (percent: number) => void,
): Promise<unknown> {
  const estimatedTotal = estimateFormDataBytes(formData);
  return (
    await api.post(`/api/xodim/tasks/${id}/submit-report`, formData, {
      headers: { 'Content-Type': undefined },
      onUploadProgress: (event) => {
        if (!onProgress) return;
        // Prefer the browser-reported total; fall back to our own estimate when
        // the WebView doesn't provide one (otherwise the bar would never move).
        const total = event.total || estimatedTotal;
        if (total > 0) {
          onProgress(Math.min(100, Math.round((event.loaded * 100) / total)));
        }
      },
    })
  ).data;
}

export default api;
