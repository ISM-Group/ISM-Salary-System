import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Required for CORS with credentials
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear auth and redirect to login
      // Only redirect if not already on login page to avoid loops
      if (window.location.pathname !== '/auth/login') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/auth/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: async (username: string, password: string) => {
    const response = await api.post('/auth/login', { username, password });
    return response.data;
  },
  logout: async () => {
    await api.post('/auth/logout');
  },
  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

// Dashboard API
export const dashboardAPI = {
  getStats: async () => {
    const response = await api.get('/dashboard/stats');
    return response.data;
  },
  getSalaryTrends: async (months: number = 6) => {
    const response = await api.get(`/dashboard/salary-trends?months=${months}`);
    return response.data;
  },
  getDepartmentDistribution: async () => {
    const response = await api.get('/dashboard/department-distribution');
    return response.data;
  },
  getAttendanceStats: async (months: number = 6) => {
    const response = await api.get(`/dashboard/attendance-stats?months=${months}`);
    return response.data;
  },
  getLoanBreakdown: async () => {
    const response = await api.get('/dashboard/loan-breakdown');
    return response.data;
  },
  getRecentActivity: async (limit: number = 10) => {
    const response = await api.get(`/dashboard/recent-activity?limit=${limit}`);
    return response.data;
  },
};

// Employees API
export const employeesAPI = {
  getAll: async (params?: Record<string, unknown>) => {
    const response = await api.get('/employees', { params });
    return response.data;
  },
  getById: async (id: string) => {
    const response = await api.get(`/employees/${id}`);
    return response.data;
  },
  create: async (data: unknown) => {
    const config = data instanceof FormData 
      ? { headers: { 'Content-Type': 'multipart/form-data' } }
      : {};
    const response = await api.post('/employees', data, config);
    return response.data;
  },
  update: async (id: string, data: unknown) => {
    const config = data instanceof FormData 
      ? { headers: { 'Content-Type': 'multipart/form-data' } }
      : {};
    const response = await api.put(`/employees/${id}`, data, config);
    return response.data;
  },
  getProfile: async (id: string) => {
    const response = await api.get(`/employees/${id}/profile`);
    return response.data;
  },
};

// Salary History API
export const salaryHistoryAPI = {
  getByEmployee: async (employeeId: string) => {
    const response = await api.get(`/salary-history/employee/${employeeId}`);
    return response.data;
  },
  create: async (employeeId: string, data: {
    effectiveFrom: string;
    salaryType: 'FIXED' | 'DAILY_WAGE';
    baseSalary: number;
    reason: string;
    notes?: string;
  }) => {
    const response = await api.post(`/salary-history/employee/${employeeId}`, data);
    return response.data;
  },
};

// Holidays API
export const holidaysAPI = {
  getAll: async (params?: { from?: string; to?: string }) => {
    const response = await api.get('/holidays', { params });
    return response.data;
  },
  getById: async (id: string) => {
    const response = await api.get(`/holidays/${id}`);
    return response.data;
  },
  create: async (data: { date: string; name: string; type: 'PAID' | 'UNPAID'; scope?: string }) => {
    const response = await api.post('/holidays', data);
    return response.data;
  },
  update: async (id: string, data: Partial<{ date: string; name: string; type: 'PAID' | 'UNPAID'; scope: string }>) => {
    const response = await api.put(`/holidays/${id}`, data);
    return response.data;
  },
  delete: async (id: string) => {
    const response = await api.delete(`/holidays/${id}`);
    return response.data;
  },
};

// Attendance API
export const attendanceAPI = {
  getAll: async (params?: Record<string, unknown>) => {
    const response = await api.get('/attendance', { params });
    return response.data;
  },
  create: async (data: unknown) => {
    const response = await api.post('/attendance', data);
    return response.data;
  },
  update: async (id: string, data: unknown) => {
    const response = await api.put(`/attendance/${id}`, data);
    return response.data;
  },
  getDaily: async (date: string) => {
    const response = await api.get(`/attendance/daily?date=${date}`);
    return response.data;
  },
  getEmployeeAttendanceCalendar: async (employeeId: string, params: { from: string; to: string }) => {
    const response = await api.get(`/attendance/employee/${employeeId}/calendar`, { params });
    return response.data;
  },
};

// Loans API
export const loansAPI = {
  getAll: async (params?: Record<string, unknown>) => {
    const response = await api.get('/loans', { params });
    return response.data;
  },
  getById: async (id: string) => {
    const response = await api.get(`/loans/${id}`);
    return response.data;
  },
  create: async (data: unknown) => {
    const response = await api.post('/loans', data);
    return response.data;
  },
  update: async (id: string, data: unknown) => {
    const response = await api.put(`/loans/${id}`, data);
    return response.data;
  },
  updateInstallment: async (installmentId: string, data: {
    amount: number;
    extensionMethod?: 'EXTEND' | 'REDISTRIBUTE';
    adjustmentNotes?: string;
  }) => {
    const response = await api.put(`/loans/installments/${installmentId}`, data);
    return response.data;
  },
};

// Advance Salaries API
export const advanceSalariesAPI = {
  getAll: async (params?: Record<string, unknown>) => {
    const response = await api.get('/advance-salaries', { params });
    return response.data;
  },
  create: async (data: FormData) => {
    const response = await api.post('/advance-salaries', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};

// Salary API
export const salaryAPI = {
  calculate: async (data: unknown) => {
    const response = await api.post('/salary/calculate', data);
    return response.data;
  },
  getHistory: async (params?: Record<string, unknown>) => {
    const response = await api.get('/salary/history', { params });
    return response.data;
  },
};

// Departments API
export const departmentsAPI = {
  getAll: async () => {
    const response = await api.get('/departments');
    return response.data;
  },
  getById: async (id: string) => {
    const response = await api.get(`/departments/${id}`);
    return response.data;
  },
  create: async (data: unknown) => {
    const response = await api.post('/departments', data);
    return response.data;
  },
  update: async (id: string, data: unknown) => {
    const response = await api.put(`/departments/${id}`, data);
    return response.data;
  },
};

// Roles API
export const rolesAPI = {
  getAll: async (params?: Record<string, unknown>) => {
    const response = await api.get('/roles', { params });
    return response.data;
  },
  getByDepartment: async (departmentId: string) => {
    const response = await api.get(`/roles/department/${departmentId}`);
    return response.data;
  },
  getById: async (id: string) => {
    const response = await api.get(`/roles/${id}`);
    return response.data;
  },
  create: async (data: unknown) => {
    const response = await api.post('/roles', data);
    return response.data;
  },
  update: async (id: string, data: unknown) => {
    const response = await api.put(`/roles/${id}`, data);
    return response.data;
  },
  delete: async (id: string) => {
    const response = await api.delete(`/roles/${id}`);
    return response.data;
  },
};

// Audit Logs API
export const auditLogsAPI = {
  getAll: async (params?: Record<string, unknown>) => {
    const response = await api.get('/audit-logs', { params });
    return response.data;
  },
  verifyPasskey: async (passkey: string) => {
    const response = await api.post('/audit-logs/verify-passkey', { passkey });
    return response.data;
  },
};

export default api;

