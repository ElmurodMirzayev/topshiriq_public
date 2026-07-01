import React from 'react';
import type { Employee } from '../types/models';

interface EmployeeCardProps {
  employee: Employee;
}

/**
 * Карточка сотрудника.
 *
 * Ахмедов Ахмад                   Фаол
 * 📍 Қарши шаҳри
 * 💼 Агроном
 * 📱 +998 90 123 45 67
 */
function EmployeeCard({ employee }: EmployeeCardProps) {
  const formatPhone = (phone: string): string => {
    const d = phone.replace(/\D/g, '');
    if (d.length === 12 && d.startsWith('998')) {
      return `+${d.slice(0, 3)} ${d.slice(3, 5)} ${d.slice(5, 8)} ${d.slice(8, 10)} ${d.slice(10)}`;
    }
    if (d.length === 9) {
      return `+998 ${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 7)} ${d.slice(7)}`;
    }
    return `+${d}`;
  };

  return (
    <div className={`employee-card ${!employee.is_active ? 'employee-inactive' : ''}`}>
      <div className="employee-card-header">
        <span className="employee-name">{employee.full_name}</span>
        <span className={`employee-status ${employee.is_active ? 'emp-active' : 'emp-inactive'}`}>
          {employee.is_active ? 'Фаол' : 'Фаол эмас'}
        </span>
      </div>
      <div className="employee-detail">📍 {employee.region}</div>
      <div className="employee-detail">💼 {employee.position}</div>
      <div className="employee-detail employee-phone-line">📱 {formatPhone(employee.phone_number)}</div>
      <div className="employee-meta">
        {employee.telegram_user_id ? '✅ Telegram бириктирилган' : '⏳ Telegram бириктирилмаган'}
      </div>
    </div>
  );
}

export default EmployeeCard;
