// ЕДИНЫЙ ИСТОЧНИК СТАТУСОВ И ИХ ОТОБРАЖЕНИЯ.
//
// Раньше строки статусов ('pending', 'accepted', 'reported', ...), их подписи,
// цвета бейджей и классы строк дублировались по множеству компонентов. Теперь
// всё описано здесь. Чтобы добавить новый статус или изменить подпись/цвет,
// достаточно отредактировать ЭТОТ файл — компоненты подхватят изменения.
//
// Значения строк совпадают с тем, что хранит и возвращает backend, поэтому
// бизнес-логика и API-совместимость не меняются.

import type { ReportFormat } from '../types/models';

// ─────────────────────────── Статусы назначения ───────────────────────────
export const ASSIGNMENT_STATUS = {
  NONE: 'none',
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REPORTED: 'reported',
  APPROVED: 'approved',
  REWORK: 'rework',
} as const;

export type AssignmentStatus = (typeof ASSIGNMENT_STATUS)[keyof typeof ASSIGNMENT_STATUS];

// ───────────────────────────── Статусы поручения ──────────────────────────
export const TASK_STATUS = {
  NEW: 'yangi',
  IN_PROGRESS: 'bajarilmoqda',
  DONE: 'bajarildi',
  REJECTED: 'rad_etildi',
} as const;

export type TaskStatus = (typeof TASK_STATUS)[keyof typeof TASK_STATUS];

// CSS-классы бейджей (определены в стилях badges).
export type BadgeClass = 'badge-green' | 'badge-orange' | 'badge-red' | 'badge-gray';

// Точка зрения, влияющая на подпись статуса назначения:
//  - manager  — экраны руководителя/админа (TaskDetail);
//  - employee — экраны сотрудника (XodimTaskList).
export type StatusPerspective = 'manager' | 'employee';

interface AssignmentStatusMeta {
  badgeClass: BadgeClass;      // цвет бейджа
  rowClass: string;            // класс строки сотрудника в списке деталей
  managerLabel: string;        // подпись на экранах руководителя
  employeeLabel: string;       // подпись на экранах сотрудника
}

const ASSIGNMENT_STATUS_META: Record<AssignmentStatus, AssignmentStatusMeta> = {
  [ASSIGNMENT_STATUS.NONE]: {
    badgeClass: 'badge-gray',
    rowClass: '',
    managerLabel: '',
    employeeLabel: 'Янги',
  },
  [ASSIGNMENT_STATUS.PENDING]: {
    badgeClass: 'badge-gray',
    rowClass: '',
    managerLabel: 'Кутилмоқда',
    employeeLabel: 'Янги',
  },
  [ASSIGNMENT_STATUS.ACCEPTED]: {
    badgeClass: 'badge-green',
    rowClass: 'emp-row-green',
    managerLabel: 'Қабул қилди',
    employeeLabel: 'Қабул қилинди',
  },
  [ASSIGNMENT_STATUS.REPORTED]: {
    badgeClass: 'badge-orange',
    rowClass: 'emp-row-orange',
    managerLabel: 'Ҳисобот келди',
    employeeLabel: 'Ҳисобот топширилди',
  },
  [ASSIGNMENT_STATUS.APPROVED]: {
    badgeClass: 'badge-green',
    rowClass: 'emp-row-green',
    managerLabel: 'Ҳисобот қабул қилинди',
    employeeLabel: 'Ҳисобот қабул қилинди',
  },
  [ASSIGNMENT_STATUS.REWORK]: {
    badgeClass: 'badge-red',
    rowClass: 'emp-row-red',
    managerLabel: 'Қайта ишлашга',
    employeeLabel: 'Қайта ишлашга',
  },
};

export interface BadgeInfo {
  label: string;
  className: BadgeClass;
}

// Бейдж статуса назначения для указанной точки зрения.
export function getAssignmentBadge(
  status: AssignmentStatus,
  perspective: StatusPerspective = 'manager'
): BadgeInfo {
  const meta = ASSIGNMENT_STATUS_META[status] ?? ASSIGNMENT_STATUS_META[ASSIGNMENT_STATUS.NONE];
  return {
    label: perspective === 'employee' ? meta.employeeLabel : meta.managerLabel,
    className: meta.badgeClass,
  };
}

// Класс строки сотрудника (подсветка фона) в списке деталей поручения.
export function getAssignmentRowClass(status: AssignmentStatus): string {
  return ASSIGNMENT_STATUS_META[status]?.rowClass ?? '';
}

// Бейдж статуса на экране просмотра отчёта (формулировки отличаются от списка).
export function getReportViewBadge(status: AssignmentStatus): BadgeInfo {
  if (status === ASSIGNMENT_STATUS.APPROVED) {
    return { label: 'Ҳисобот қабул қилинди', className: 'badge-green' };
  }
  if (status === ASSIGNMENT_STATUS.REWORK) {
    return { label: 'Қайта ишлашга юборилди', className: 'badge-red' };
  }
  return { label: 'Ҳисобот келди', className: 'badge-orange' };
}

// Статусы, при которых у назначения есть отчёт для просмотра.
const STATUSES_WITH_REPORT: AssignmentStatus[] = [
  ASSIGNMENT_STATUS.REPORTED,
  ASSIGNMENT_STATUS.APPROVED,
  ASSIGNMENT_STATUS.REWORK,
];

export function hasReport(status: AssignmentStatus): boolean {
  return STATUSES_WITH_REPORT.includes(status);
}

// Статусы, при которых для сотрудника действия (приём/отправка отчёта) активны,
// то есть работа ещё не завершена.
const STATUSES_ACTIONABLE: AssignmentStatus[] = [
  ASSIGNMENT_STATUS.NONE,
  ASSIGNMENT_STATUS.ACCEPTED,
  ASSIGNMENT_STATUS.REWORK,
];

export function isActionable(status: AssignmentStatus): boolean {
  return STATUSES_ACTIONABLE.includes(status);
}

// Карты статусов для карточек статистики на странице деталей поручения.
// Ключ — карточка статистики, значение — статусы назначений, которые она показывает.
export const STAT_FILTER_STATUSES = {
  accepted: [ASSIGNMENT_STATUS.ACCEPTED],
  reported: [ASSIGNMENT_STATUS.REPORTED],
  approved: [ASSIGNMENT_STATUS.APPROVED],
  // «Ҳисобот топширмаган» — те, кто ещё не сдал отчёт.
  not_submitted: [ASSIGNMENT_STATUS.NONE, ASSIGNMENT_STATUS.PENDING, ASSIGNMENT_STATUS.ACCEPTED],
} as const;

export type StatFilterKey = keyof typeof STAT_FILTER_STATUSES;

// ─────────────────────── Метаданные статусов поручения ────────────────────
interface TaskStatusMeta {
  label: string;
  className: string; // класс из стилей карточек (status-new / status-progress / ...)
}

const TASK_STATUS_META: Record<TaskStatus, TaskStatusMeta> = {
  [TASK_STATUS.NEW]: { label: 'Янги', className: 'status-new' },
  [TASK_STATUS.IN_PROGRESS]: { label: 'Бажарилмоқда', className: 'status-progress' },
  [TASK_STATUS.DONE]: { label: 'Бажарилди', className: 'status-done' },
  [TASK_STATUS.REJECTED]: { label: 'Рад этилди', className: 'status-rejected' },
};

export function getTaskStatusMeta(status: TaskStatus): TaskStatusMeta {
  return TASK_STATUS_META[status] ?? TASK_STATUS_META[TASK_STATUS.NEW];
}

// ─────────────────────────── Форматы отчёта ───────────────────────────────
export const REPORT_FORMAT_LABELS: Record<ReportFormat, string> = {
  video: '🎥 Video',
  audio: '🎧 Audio',
  rasm: '🖼 Rasm',
  matn: '📝 Matn',
};

export interface ReportFormatOption {
  value: ReportFormat;
  label: string;
}

export const REPORT_FORMAT_OPTIONS: ReportFormatOption[] = [
  { value: 'video', label: REPORT_FORMAT_LABELS.video },
  { value: 'audio', label: REPORT_FORMAT_LABELS.audio },
  { value: 'rasm', label: REPORT_FORMAT_LABELS.rasm },
  { value: 'matn', label: REPORT_FORMAT_LABELS.matn },
];

export function formatReportFormats(formats?: ReportFormat[]): string {
  return (formats ?? []).map((f) => REPORT_FORMAT_LABELS[f] ?? f).join(', ');
}
