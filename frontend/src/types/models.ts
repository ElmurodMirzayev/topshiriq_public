// Доменные типы приложения. Совместимы с ответами существующего backend.

import { AssignmentStatus, TaskStatus } from '../constants/status';

// Роли пользователей. Значения совпадают с тем, что возвращает backend.
export type Role = 'boshliq' | 'admin' | 'xodim';

// Форматы отчёта, которые может требовать поручение.
export type ReportFormat = 'video' | 'audio' | 'rasm' | 'matn';

// Текущий пользователь (ответ /api/auth/login и состояние после привязки телефона).
export interface User {
  telegram_id: number;
  username?: string;
  first_name?: string;
  role: Role;
}

// Ответ /api/auth/check-binding (привязка телефона к Telegram).
export interface BindingResult {
  bound: boolean;
  role?: Role;
  telegram_id?: number;
  username?: string;
  first_name?: string;
}

// Поручение в списке (Boshliq / Admin).
export interface Task {
  id: number;
  number: number;
  name: string;
  description: string;
  status: TaskStatus;
  deadline: string;
  created_at: string;
  report_format?: ReportFormat[];
  not_submitted_count?: number;
  total_employees?: number;
}

export interface TaskListResponse {
  tasks: Task[];
  total: number;
}

// Данные для создания поручения.
export interface CreateTaskPayload {
  name: string;
  description: string;
  report_format: ReportFormat[];
  deadline: string;
}

// Статистика по поручению (карточки на странице деталей).
export interface TaskStats {
  total_employees: number;
  accepted_count: number;
  reported_count: number;
  approved_count: number;
  not_submitted_count: number;
}

// Назначение поручения сотруднику.
export interface Assignment {
  employee_id: number;
  employee_name: string;
  employee_position: string;
  employee_region: string;
  status: AssignmentStatus;
  accepted_at?: string | null;
  reported_at?: string | null;
  reviewed_at?: string | null;
  review_comment?: string | null;
}

// Детали поручения (Boshliq / Admin).
export interface TaskDetail {
  id: number;
  number: number;
  name: string;
  description: string;
  report_format?: ReportFormat[];
  created_at: string;
  deadline: string;
  stats?: TaskStats;
  assignments: Assignment[];
}

// Сотрудник.
export interface Employee {
  id: number;
  full_name: string;
  region: string;
  position: string;
  phone_number: string;
  is_active: boolean;
  telegram_user_id?: number | null;
}

export interface EmployeeListResponse {
  employees: Employee[];
  total: number;
}

// Данные для создания сотрудника.
export interface CreateEmployeePayload {
  full_name: string;
  region: string;
  position: string;
  phone_number: string;
}

// Файл, прикреплённый к отчёту.
export interface ReportFile {
  id: number;
  file_type: ReportFormat;
  file_name: string;
  file_size: number;
  file_path: string;
  file_url?: string;
}

// Отчёт сотрудника (ответ /api/tasks/:id/report/:empId).
export interface EmployeeReport {
  employee: {
    full_name: string;
    position: string;
    region: string;
  };
  assignment: Assignment & {
    review_comment?: string | null;
  };
  report: {
    comment?: string | null;
    files: ReportFile[];
  };
}

// Поручение в списке сотрудника (Xodim).
export interface XodimTask {
  id: number;
  number: number;
  name: string;
  description: string;
  deadline: string;
  created_at: string;
  my_status: AssignmentStatus;
  report_format?: ReportFormat[];
  review_comment?: string | null;
}

export interface XodimTaskListResponse {
  tasks: XodimTask[];
}

// ─────────────────────────────── Статистика ─────────────────────────────
// Скользящее окно от текущего момента (значения совпадают с backend PERIOD_DAYS).
export type StatsPeriod = '1w' | '1m' | '2m' | '6m' | '1y';

// Сотрудник в топе (по числу принятых отчётов за период).
export interface StatsTopEmployee {
  employee_id: number;
  employee_name: string;
  approved_count: number;
  rework_count: number;
}

// Итоговые метрики за период (ответ /api/stats/summary).
export interface StatsSummary {
  total_tasks_created: number;
  total_reports_submitted: number;
  approved_count: number;
  rework_count: number;
  reported_count: number;
  rework_rate: number;
  avg_review_time_hours: number | null;
  active_employees_count: number;
  top_employees: StatsTopEmployee[];
}

// Точка динамики для графика (ответ /api/stats/timeline).
export interface StatsTimelinePoint {
  date: string;
  submitted_count: number;
  approved_count: number;
  rework_count: number;
}
