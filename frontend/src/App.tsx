import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AdminTabs from './components/AdminTabs';
import BoshliqTabs from './components/BoshliqTabs';
import TaskList from './pages/TaskList';
import Stats from './pages/Stats';
import TaskCreate from './pages/TaskCreate';
import TaskDetail from './pages/TaskDetail';
import ReportView from './pages/ReportView';
import EmployeeList from './pages/EmployeeList';
import EmployeeCreate from './pages/EmployeeCreate';
import XodimTaskList from './pages/XodimTaskList';
import XodimTaskDetail from './pages/XodimTaskDetail';
import XodimReportForm from './pages/XodimReportForm';
import PhoneVerify from './pages/PhoneVerify';

// Маршруты руководителя (boshliq): просмотр, создание, проверка отчётов.
function BoshliqRoutes() {
  return (
    <Routes>
      <Route element={<BoshliqTabs />}>
        <Route path="/" element={<TaskList />} />
        <Route path="/stats" element={<Stats />} />
      </Route>
      <Route path="/tasks/new" element={<TaskCreate />} />
      <Route path="/tasks/:taskId" element={<TaskDetail />} />
      <Route path="/tasks/:taskId/report/:employeeId" element={<ReportView />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

// Маршруты админа: список поручений и управление сотрудниками (с нижними вкладками).
function AdminRoutes() {
  return (
    <Routes>
      <Route element={<AdminTabs />}>
        <Route path="/" element={<TaskList />} />
        <Route path="/employees" element={<EmployeeList />} />
        <Route path="/employees/new" element={<EmployeeCreate />} />
        <Route path="/stats" element={<Stats />} />
      </Route>
      <Route path="/tasks/:taskId" element={<TaskDetail />} />
      <Route path="/tasks/:taskId/report/:employeeId" element={<ReportView />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

// Маршруты сотрудника (xodim): свои поручения и отправка отчётов.
function XodimRoutes() {
  return (
    <Routes>
      <Route path="/" element={<XodimTaskList />} />
      <Route path="/tasks/:taskId" element={<XodimTaskDetail />} />
      <Route path="/tasks/:taskId/report" element={<XodimReportForm />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

// До подтверждения телефона — любой путь ведёт на экран верификации.
function PhoneRoutes() {
  return (
    <Routes>
      <Route path="*" element={<PhoneVerify />} />
    </Routes>
  );
}

function AppRoutes() {
  const { user, loading, error, needsPhone } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p>Юкланмоқда...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-screen">
        <p>❌ {error}</p>
      </div>
    );
  }

  let routes: React.ReactNode;
  if (needsPhone || !user) {
    routes = <PhoneRoutes />;
  } else if (user.role === 'xodim') {
    routes = <XodimRoutes />;
  } else if (user.role === 'admin') {
    routes = <AdminRoutes />;
  } else {
    routes = <BoshliqRoutes />;
  }

  return <div className="app">{routes}</div>;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
