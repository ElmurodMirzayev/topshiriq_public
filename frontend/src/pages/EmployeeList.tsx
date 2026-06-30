import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getEmployees } from '../api/api';
import EmployeeCard from '../components/EmployeeCard';
import type { Employee } from '../types/models';

function EmployeeList() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const d = await getEmployees();
      setEmployees(d.employees);
      setTotal(d.total);
      setError(null);
    } catch {
      setError('Ходимларни юклашда хатолик');
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
        <h1 className="header-title">Ходимлар рўйхати</h1>
        {total > 0 && <span className="header-badge">{total}</span>}
      </div>
      <div className="content">
        {loading && (
          <div className="loading-container">
            <div className="spinner" />
            <p>Юкланмоқда...</p>
          </div>
        )}
        {error && (
          <div className="error-container">
            <p>❌ {error}</p>
            <button className="retry-btn" onClick={() => void load()}>Қайта уриниш</button>
          </div>
        )}
        {!loading && !error && employees.length === 0 && (
          <div className="empty-container">
            <div className="empty-icon">👤</div>
            <p className="empty-text">Ҳозирча ходимлар йўқ</p>
            <p className="empty-subtext">Янги ходим қўшиш учун «+» тугмасини босинг</p>
          </div>
        )}
        {!loading && !error && employees.length > 0 && (
          <div className="task-list">
            {employees.map((e) => (
              <EmployeeCard key={e.id} employee={e} />
            ))}
          </div>
        )}
      </div>
      <button className="fab" onClick={() => navigate('/employees/new')}>+</button>
    </div>
  );
}

export default EmployeeList;
