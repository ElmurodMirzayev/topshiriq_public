import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';

// Лейаут с нижними вкладками админа. Оборачивает страницы «Топшириқлар» и
// «Ходимлар», на которых вкладки должны быть видны (но не на деталях/отчётах).
function AdminTabs() {
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
          to="/employees"
          className={({ isActive }) => `tab-btn ${isActive ? 'tab-active' : ''}`}
        >
          👥 Ходимлар
        </NavLink>
      </div>
    </>
  );
}

export default AdminTabs;
