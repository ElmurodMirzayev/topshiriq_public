import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTasks } from '../api/api';
import TaskCard from '../components/TaskCard';
import { useAuth } from '../context/AuthContext';
import type { Task } from '../types/models';

function TaskList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const d = await getTasks();
      setTasks(d.tasks);
      setTotal(d.total);
      setError(null);
    } catch {
      if (!window.Telegram?.WebApp?.initData) {
        setTasks([]);
        setTotal(0);
        setError(null);
      } else {
        setError('Хатолик');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const isAdmin = user?.role === 'admin';
  const isBoshliq = user?.role === 'boshliq';

  return (
    <div className="page">
      <div className="header">
        <h1 className="header-title">Барча топшириқлар</h1>
        {total > 0 && <span className="header-badge">{total}</span>}
      </div>
      <div className={`content ${isAdmin ? 'content-with-tabs' : ''}`}>
        {loading && (
          <div className="loading-container">
            <div className="spinner" />
          </div>
        )}
        {error && (
          <div className="error-container">
            <p>❌ {error}</p>
          </div>
        )}
        {!loading && !error && tasks.length === 0 && (
          <div className="empty-container">
            <div className="empty-icon">📋</div>
            <p className="empty-text">Ҳозирча топшириқлар йўқ</p>
          </div>
        )}
        {!loading && !error && tasks.length > 0 && (
          <div className="task-list">
            {tasks.map((t) => (
              <div key={t.id} onClick={() => navigate(`/tasks/${t.id}`)}>
                <TaskCard task={t} />
              </div>
            ))}
          </div>
        )}
      </div>
      {isBoshliq && (
        <button className="fab" onClick={() => navigate('/tasks/new')}>
          +
        </button>
      )}
    </div>
  );
}

export default TaskList;
