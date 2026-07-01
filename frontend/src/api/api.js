import axios from 'axios';
const api = axios.create({ baseURL: process.env.REACT_APP_API_URL || '', headers: {'Content-Type':'application/json'} });
function gid() { return window.Telegram?.WebApp?.initData || ''; }
api.interceptors.request.use(c => { const d = gid(); if (d) c.headers['X-Telegram-Init-Data'] = d; return c; });

// Auth
export async function login(i) { return (await api.post('/api/auth/login', null, { headers: {'X-Telegram-Init-Data': i} })).data; }
export async function checkBinding() { return (await api.get('/api/auth/check-binding')).data; }

// Tasks (Boshliq/Admin)
export async function getTasks(s=0,l=100) { return (await api.get('/api/tasks', {params:{skip:s,limit:l}})).data; }
export async function createTask(d) { return (await api.post('/api/tasks', d)).data; }
export async function getTaskDetail(id) { return (await api.get(`/api/tasks/${id}/detail`)).data; }
export async function getEmployeeReport(taskId, empId) { return (await api.get(`/api/tasks/${taskId}/report/${empId}`)).data; }
export async function approveReport(taskId, empId) { return (await api.post(`/api/tasks/${taskId}/report/${empId}/approve`)).data; }
export async function reworkReport(taskId, empId, comment) { return (await api.post(`/api/tasks/${taskId}/report/${empId}/rework`, { comment })).data; }

// Employees (Admin)
export async function getEmployees(s=0,l=100) { return (await api.get('/api/admin/employees', {params:{skip:s,limit:l}})).data; }
export async function createEmployee(d) { return (await api.post('/api/admin/employees', d)).data; }

// Xodim
export async function getXodimTasks() { return (await api.get('/api/xodim/tasks')).data; }
export async function getXodimTaskDetail(id) { return (await api.get(`/api/xodim/tasks/${id}`)).data; }
export async function acceptTask(id) { return (await api.post(`/api/xodim/tasks/${id}/accept`)).data; }
export async function submitReportFiles(id, formData) {
  return (await api.post(`/api/xodim/tasks/${id}/submit-report`, formData, {
    headers: { 'Content-Type': undefined }
  })).data;
}

export default api;
