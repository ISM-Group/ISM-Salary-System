import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5002/api';

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
      if (window.location.pathname !== '/login') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
// PUBLIC_INTERFACE
/**
 * Authentication API methods for login, register, logout, and current user retrieval.
 */
export const authAPI = {
  register: async (payload: { username: string; password: string; fullName: string; role?: 'ADMIN' | 'MANAGER' }) => {
    const response = await api.post('/auth/register', payload);
    return response.data;
  },
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
// PUBLIC_INTERFACE
/**
 * Dashboard API methods for fetching statistics and analytics data.
 */
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
// PUBLIC_INTERFACE
/**
 * Employee management API methods for CRUD operations on employee records.
 */
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
  delete: async (id: string) => {
    const response = await api.delete(`/employees/${id}`);
    return response.data;
  },
  getProfile: async (id: string) => {
    const response = await api.get(`/employees/${id}/profile`);
    return response.data;
  },
};

// Salary History API
// PUBLIC_INTERFACE
/**
 * Salary history API methods for tracking employee salary changes over time.
 */
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
// PUBLIC_INTERFACE
/**
 * Holidays API methods for managing public holidays and their types.
 */
export const holidaysAPI = {
  getAll: async (params?: { from?: string; to?: string }) => {
    const response = await api.get('/holidays', { params });
    return response.data;
  },
  getById: async (id: string) => {
    const response = await api.get(`/holidays/${id}`);
    return response.data;
  },
  create: async (data: { date: string; name: string; type: 'PAID' | 'UNPAID'; scope?: string; employeeIds?: string[] }) => {
    const response = await api.post('/holidays', data);
    return response.data;
  },
  update: async (id: string, data: Partial<{ date: string; name: string; type: 'PAID' | 'UNPAID'; scope: string; employeeIds?: string[] }>) => {
    const response = await api.put(`/holidays/${id}`, data);
    return response.data;
  },
  delete: async (id: string) => {
    const response = await api.delete(`/holidays/${id}`);
    return response.data;
  },
  /** Update employee assignments for a PER_EMPLOYEE holiday */
  updateEmployees: async (id: string, employeeIds: string[]) => {
    const response = await api.put(`/holidays/${id}/employees`, { employeeIds });
    return response.data;
  },
  /** Get holidays applicable to a specific employee */
  getByEmployee: async (employeeId: string, params?: { from?: string; to?: string }) => {
    const response = await api.get(`/holidays/employee/${employeeId}`, { params });
    return response.data;
  },
};

// Attendance API
// PUBLIC_INTERFACE
/**
 * Attendance API methods for recording and viewing employee attendance.
 */
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
// PUBLIC_INTERFACE
/**
 * Loans API methods for managing employee loans with MONTHLY and DAILY repayment modes.
 */
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
  /**
   * Early-settle an ACTIVE loan: marks it PAID and closes all pending installments.
   * @param id - Loan UUID
   * @param notes - Optional settlement notes
   */
  settle: async (id: string, notes?: string) => {
    const response = await api.post(`/loans/${id}/settle`, { notes });
    return response.data;
  },
  /**
   * Extend a MONTHLY ACTIVE loan by adding extra monthly installments.
   * @param id - Loan UUID
   * @param numInstallments - Number of extra months to add (1-60)
   * @param installmentAmount - Optional fixed amount per new installment;
   *                            defaults to remaining_balance / numInstallments
   * @param notes - Optional notes
   */
  extend: async (
    id: string,
    numInstallments: number,
    installmentAmount?: number,
    notes?: string,
  ) => {
    const response = await api.post(`/loans/${id}/extend`, {
      numInstallments,
      installmentAmount,
      notes,
    });
    return response.data;
  },
};

// Advance Salaries API
// PUBLIC_INTERFACE
/**
 * Advance salaries API methods for creating, viewing, and managing salary advances.
 * Supports approval workflow (PENDING/APPROVED/REJECTED) that integrates with
 * daily salary releases — only APPROVED advances are deducted.
 */
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
  getByEmployee: async (employeeId: string) => {
    const response = await api.get(`/advance-salaries/employee/${employeeId}`);
    return response.data;
  },
  /** Update the status of an advance salary (approve/reject) */
  updateStatus: async (id: string, status: 'APPROVED' | 'REJECTED' | 'PENDING') => {
    const response = await api.put(`/advance-salaries/${id}/status`, { status });
    return response.data;
  },
};

// Salary API
// PUBLIC_INTERFACE
/**
 * Salary calculation API methods for computing and viewing salary records.
 */
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
// PUBLIC_INTERFACE
/**
 * Departments API methods for CRUD operations on departments.
 */
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
  delete: async (id: string) => {
    const response = await api.delete(`/departments/${id}`);
    return response.data;
  },
};

// Roles API
// PUBLIC_INTERFACE
/**
 * Roles API methods for managing employee roles and their configurations.
 */
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
// PUBLIC_INTERFACE
/**
 * Audit logs API methods for viewing system audit trail.
 */
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

// Daily Salary Releases API
// PUBLIC_INTERFACE
/**
 * Client API methods for daily salary release management.
 * Supports generating, viewing, releasing, and deleting daily salary payouts
 * for daily-wage employees. Also provides employee-specific history access.
 */
export const dailyReleasesAPI = {
  /** Generate daily release records for a given date */
  generate: async (date: string) => {
    const response = await api.post('/daily-releases/generate', { date });
    return response.data;
  },
  /** Get all daily releases for a given date */
  getAll: async (date: string) => {
    const response = await api.get('/daily-releases', { params: { date } });
    return response.data;
  },
  /** Get daily release history for a specific employee */
  getByEmployee: async (employeeId: string, params?: { from?: string; to?: string }) => {
    const response = await api.get(`/daily-releases/employee/${employeeId}`, { params });
    return response.data;
  },
  /** Mark a single daily release as RELEASED */
  release: async (id: string) => {
    const response = await api.put(`/daily-releases/${id}/release`);
    return response.data;
  },
  /** Bulk release all pending daily salaries for a date */
  releaseAll: async (date: string) => {
    const response = await api.put('/daily-releases/release-all', { date });
    return response.data;
  },
  /** Delete a PENDING daily release record */
  deleteRelease: async (id: string) => {
    const response = await api.delete(`/daily-releases/${id}`);
    return response.data;
  },
};

// Exports API
// PUBLIC_INTERFACE
/**
 * Exports API methods for downloading CSV/HTML reports for payroll, attendance, loans,
 * and generating printable payslips.
 */
export const exportsAPI = {
  /** Download payroll report as CSV or open as HTML for printing/PDF */
  getPayrollExport: (params?: Record<string, string>) => {
    const query = new URLSearchParams(params).toString();
    return `${API_BASE_URL}/exports/payroll?${query}`;
  },
  /** Download attendance report as CSV or open as HTML for printing/PDF */
  getAttendanceExport: (params?: Record<string, string>) => {
    const query = new URLSearchParams(params).toString();
    return `${API_BASE_URL}/exports/attendance?${query}`;
  },
  /** Download loans report as CSV or open as HTML for printing/PDF */
  getLoansExport: (params?: Record<string, string>) => {
    const query = new URLSearchParams(params).toString();
    return `${API_BASE_URL}/exports/loans?${query}`;
  },
  /** Generate payslip HTML for an employee for a given month */
  getPayslipUrl: (employeeId: string, month: string) => {
    return `${API_BASE_URL}/exports/payslip/${employeeId}?month=${month}`;
  },
};

// Self-Service API
// PUBLIC_INTERFACE
/**
 * Self-service API methods for employees to access their own records.
 * Maps the authenticated user to their employee record.
 */
export const selfServiceAPI = {
  getProfile: async () => {
    const response = await api.get('/self-service/profile');
    return response.data;
  },
  getSalaryHistory: async () => {
    const response = await api.get('/self-service/salary-history');
    return response.data;
  },
  getAttendance: async (params?: { from?: string; to?: string }) => {
    const response = await api.get('/self-service/attendance', { params });
    return response.data;
  },
  getLoans: async () => {
    const response = await api.get('/self-service/loans');
    return response.data;
  },
  getPayslipUrl: (month: string) => {
    return `${API_BASE_URL}/self-service/payslip?month=${month}`;
  },
};

export default api;
