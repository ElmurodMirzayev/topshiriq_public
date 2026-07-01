import React from 'react';
import type { Task } from '../types/models';
import { getTaskStatusMeta, TASK_STATUS } from '../constants/status';
import { formatDateTime } from '../utils/format';

interface TaskCardProps {
  task: Task;
}

function TaskCard({ task }: TaskCardProps) {
  const st = getTaskStatusMeta(task.status);
  const overdue = new Date(task.deadline) < new Date() && task.status !== TASK_STATUS.DONE;

  return (
    <div className={`task-card ${overdue ? 'task-card-overdue' : ''}`}>
      <div className="task-card-header">
        <span className="task-number">№{task.number}</span>
        <span className={`task-status ${st.className}`}>{st.label}</span>
      </div>
      <div className="task-created-date">{formatDateTime(task.created_at)}</div>
      <h3 className="task-name">{task.name}</h3>
      <p className="task-description">{task.description}</p>
      <div className="task-deadline-row">
        <span className={`task-deadline-text ${overdue ? 'deadline-overdue' : ''}`}>
          Муддат: {formatDateTime(task.deadline)}
        </span>
      </div>
      {typeof task.not_submitted_count === 'number' && task.not_submitted_count > 0 && (
        <div className="pending-report-badge">
          <span className="pending-report-text">ҳисобот топширмаганлар сони: </span>
          <span className="pending-report-count">
            {task.not_submitted_count}/{task.total_employees}
          </span>
        </div>
      )}
    </div>
  );
}

export default TaskCard;
