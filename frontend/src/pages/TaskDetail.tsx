import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getTaskDetail } from '../api/api';
import {
  formatReportFormats,
  getAssignmentBadge,
  getAssignmentRowClass,
  hasReport,
  STAT_FILTER_STATUSES,
  type StatFilterKey,
} from '../constants/status';
import { formatDateTime } from '../utils/format';
import type { TaskDetail as TaskDetailModel } from '../types/models';

// Карточки статистики и подписи списка сотрудников для каждого фильтра.
const STAT_CARDS: { key: StatFilterKey; label: string; cls: string; pick: (s: TaskStatsLike) => number }[] = [
  { key: 'accepted', label: 'Қабул қилганлар сони', cls: 'stat-green', pick: (s) => s.accepted_count },
  { key: 'reported', label: 'Ҳисобот топширганлар сони', cls: 'stat-orange', pick: (s) => s.reported_count },
  { key: 'approved', label: 'Муваффақиятли якунлаганлар сони', cls: 'stat-green', pick: (s) => s.approved_count },
  { key: 'not_submitted', label: 'Ҳисобот топширмаганлар сони', cls: 'stat-red', pick: (s) => s.not_submitted_count },
];

interface TaskStatsLike {
  accepted_count: number;
  reported_count: number;
  approved_count: number;
  not_submitted_count: number;
}

const EMP_LIST_TITLES: Record<StatFilterKey, string> = {
  accepted: 'Қабул қилган ходимлар',
  reported: 'Ҳисобот топширган ходимлар',
  approved: 'Муваффақиятли якунлаган ходимлар',
  not_submitted: 'Ҳисобот топширмаган ходимлар',
};

function TaskDetail() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<TaskDetailModel | null>(null);
  const [loading, setLoading] = useState(true);
  // Активный фильтр статистики (ключ карточки) или null — показываем всех.
  const [activeFilter, setActiveFilter] = useState<StatFilterKey | null>(null);

  useEffect(() => {
    if (!taskId) return;
    getTaskDetail(Number(taskId))
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [taskId]);

  // Повторный клик по той же карточке сбрасывает фильтр, иначе переключает на новый.
  const toggleFilter = (key: StatFilterKey) => setActiveFilter((prev) => (prev === key ? null : key));

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
      </div>
    );
  }
  if (!data) {
    return (
      <div className="error-screen">
        <p>Топилмади</p>
      </div>
    );
  }

  const stats = data.stats;
  const total = stats?.total_employees || 0;

  // Просрочка считается динамически по дате (а не навешивается всегда).
  const overdue = new Date(data.deadline).getTime() < Date.now();

  const empListTitle = activeFilter ? EMP_LIST_TITLES[activeFilter] : 'Ходимлар';

  // Фильтрация списка сотрудников на клиенте (без лишних запросов к серверу).
  const visibleAssignments = activeFilter
    ? data.assignments.filter((a) => (STAT_FILTER_STATUSES[activeFilter] as readonly string[]).includes(a.status))
    : data.assignments;

  return (
    <div className="page">
      <div className="header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          ← Орқага
        </button>
        <h1 className="header-title create-title">Топшириқ №{data.number}</h1>
      </div>
      <div className="content">
        <div className="detail-card">
          <h2 className="detail-name">{data.name}</h2>
          <p className="detail-desc">{data.description}</p>
          <div className="detail-row">
            <span className="detail-label">Яратилган:</span>
            <span>{formatDateTime(data.created_at)}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Муддат:</span>
            <span className={overdue ? 'deadline-overdue' : ''}>{formatDateTime(data.deadline)}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Ҳисобот шакли:</span>
            <span>{formatReportFormats(data.report_format)}</span>
          </div>
        </div>
        <div className="stats-card">
          <h3 className="stats-title">Статистика</h3>
          <div className="stats-row">
            {STAT_CARDS.map((c) => (
              <button
                key={c.key}
                type="button"
                className={`stat-item stat-item-clickable${activeFilter === c.key ? ' stat-item-active' : ''}`}
                onClick={() => toggleFilter(c.key)}
                aria-pressed={activeFilter === c.key}
              >
                <span className={`stat-number ${c.cls}`}>
                  {stats ? c.pick(stats) : 0}/{total}
                </span>
                <span className="stat-label">{c.label}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="emp-list-card">
          <h3 className="stats-title">{empListTitle}</h3>
          {visibleAssignments.map((a) => {
            const clickable = hasReport(a.status);
            const badge = getAssignmentBadge(a.status, 'manager');
            return (
              <div
                key={a.employee_id}
                className={`emp-row ${getAssignmentRowClass(a.status)}`}
                onClick={() => clickable && navigate(`/tasks/${data.id}/report/${a.employee_id}`)}
                style={clickable ? { cursor: 'pointer' } : {}}
              >
                <div className="emp-row-info">
                  <span className="emp-row-name">
                    {a.employee_name} {clickable ? '→' : ''}
                  </span>
                  <span className="emp-row-pos">
                    {a.employee_position} · {a.employee_region}
                  </span>
                </div>
                <div className="emp-row-status">
                  {badge.label && <span className={badge.className}>{badge.label}</span>}
                </div>
              </div>
            );
          })}
          {visibleAssignments.length === 0 && <p className="empty-subtext">Ходимлар йўқ</p>}
        </div>
      </div>
    </div>
  );
}

export default TaskDetail;
