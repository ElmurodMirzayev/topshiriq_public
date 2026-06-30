import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getXodimTasks } from '../api/api';
import { getAssignmentBadge, isActionable } from '../constants/status';
import { formatDateTime } from '../utils/format';
import type { XodimTask } from '../types/models';

function XodimTaskList() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<XodimTask[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const d = await getXodimTasks();
      setTasks(d.tasks);
    } catch {
      /* список просто останется пустым */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="page">
      <div className="header">
        <h1 className="header-title">Менинг топшириқларим</h1>
      </div>
      <div className="content">
        {loading && (
          <div className="loading-container">
            <div className="spinner" />
          </div>
        )}
        {!loading && tasks.length === 0 && (
          <div className="empty-container">
            <div className="empty-icon">📋</div>
            <p className="empty-text">Ҳозирча топшириқлар йўқ</p>
          </div>
        )}
        {!loading && tasks.length > 0 && (
          <div className="task-list">
            {tasks.map((t) => {
              const badge = getAssignmentBadge(t.my_status, 'employee');
              // Просрочка важна, только пока работа не завершена (отчёт не сдан/не принят).
              const overdue = new Date(t.deadline).getTime() < Date.now() && isActionable(t.my_status);
              return (
                <div
                  key={t.id}
                  className={`task-card ${overdue ? 'task-card-overdue' : ''}`}
                  onClick={() => navigate(`/tasks/${t.id}`)}
                >
                  <div className="task-card-header">
                    <span className="task-number">№{t.number}</span>
                    <span className={badge.className}>{badge.label}</span>
                  </div>
                  <div className="task-created-date">{formatDateTime(t.created_at)}</div>
                  <h3 className="task-name">{t.name}</h3>
                  <p className="task-description">{t.description}</p>
                  <div className="task-deadline-row">
                    <span className={`task-deadline-text ${overdue ? 'deadline-overdue' : ''}`}>
                      Муддат: {formatDateTime(t.deadline)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default XodimTaskList;
