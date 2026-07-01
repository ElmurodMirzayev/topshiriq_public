import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';

// Лейаут с нижними вкладками руководителя (boshliq). Аналогичен AdminTabs:
// оборачивает список поручений и статистику; на деталях/создании/отчётах
// вкладки не показываются (эти маршруты вне лейаута в App.tsx).
function BoshliqTabs() {
  return (
    <>
      <Outlet />
      <div className="bottom-tabs">
        <NavLink
          to="/"
          end
          className={({ isActive }) => `tab-btn ${isActive ? 'tab-active' : ''}`}
        >
          📋 Топшириқлар
        </NavLink>
        <NavLink
          to="/stats"
          className={({ isActive }) => `tab-btn ${isActive ? 'tab-active' : ''}`}
        >
          📊 Статистика
        </NavLink>
      </div>
    </>
  );
}

export default BoshliqTabs;
