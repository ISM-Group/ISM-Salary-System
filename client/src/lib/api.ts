import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5002/api';

type ApiFieldError = {
  field?: string;
  message?: string;
};

type ApiErrorBody = {
  error?: string;
  message?: string;
  details?: ApiFieldError[];
};

export const getApiErrorMessage = (error: unknown, fallback = 'Something went wrong. Please try again.'): string => {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    const details = error.response?.data?.details;
    if (details?.length) {
      return details.map((detail) => detail.message || detail.field).filter(Boolean).join(' ');
    }

    return error.response?.data?.error || error.response?.data?.message || error.message || fallback;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
};

export const getApiFieldErrors = (error: unknown): Record<string, string> => {
  if (!axios.isAxiosError<ApiErrorBody>(error)) {
    return {};
  }

  return (error.response?.data?.details || []).reduce<Record<string, string>>((errors, detail) => {
    if (detail.field && detail.message) {
      errors[detail.field] = detail.message;
    }
    return errors;
  }, {});
};

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

// Salary Releases API
// PUBLIC_INTERFACE
export const salaryReleasesAPI = {
  preview: async (data: { employeeId: string; periodStart: string; periodEnd: string; bonus?: number }) => {
    const response = await api.post('/salary-releases/preview', data);
    return response.data;
  },
  batchPreview: async (data: { employeeIds: string[]; periodStart: string; periodEnd: string; bonus?: number }) => {
    const response = await api.post('/salary-releases/batch-preview', data);
    return response.data;
  },
  create: async (data: { employeeId: string; periodStart: string; periodEnd: string; bonus?: number; releasedAmount?: number; notes?: string }) => {
    const response = await api.post('/salary-releases', data);
    return response.data;
  },
  batchCreate: async (data: { employeeIds: string[]; periodStart: string; periodEnd: string; bonus?: number; notes?: string }) => {
    const response = await api.post('/salary-releases/batch', data);
    return response.data;
  },
  getAll: async (params?: Record<string, unknown>) => {
    const response = await api.get('/salary-releases', { params });
    return response.data;
  },
  getById: async (id: string) => {
    const response = await api.get(`/salary-releases/${id}`);
    return response.data;
  },
  getByEmployee: async (employeeId: string, params?: Record<string, unknown>) => {
    const response = await api.get(`/salary-releases/employee/${employeeId}`, { params });
    return response.data;
  },
  getEmployeeCalendar: async (employeeId: string, month: string) => {
    const response = await api.get(`/salary-releases/employee/${employeeId}/calendar`, { params: { month } });
    return response.data;
  },
  update: async (id: string, data: { releasedAmount?: number; bonus?: number; notes?: string }) => {
    const response = await api.put(`/salary-releases/${id}`, data);
    return response.data;
  },
  release: async (id: string) => {
    const response = await api.put(`/salary-releases/${id}/release`);
    return response.data;
  },
  batchRelease: async (data: { ids?: string[]; from?: string; to?: string }) => {
    const response = await api.put('/salary-releases/batch-release', data);
    return response.data;
  },
  delete: async (id: string) => {
    const response = await api.delete(`/salary-releases/${id}`);
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

// Users API
// PUBLIC_INTERFACE
export const usersAPI = {
  getAll: async () => {
    const response = await api.get('/users');
    return response.data;
  },
  resetPassword: async (id: string, newPassword: string) => {
    const response = await api.put(`/users/${id}/reset-password`, { newPassword });
    return response.data;
  },
  setStatus: async (id: string, isActive: boolean) => {
    const response = await api.put(`/users/${id}/status`, { isActive });
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


export default api;
