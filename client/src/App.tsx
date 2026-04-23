import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LoginPage } from '@/pages/auth/LoginPage';
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage';
import { EmployeesPage } from '@/pages/admin/EmployeesPage';
import { EmployeeProfilePage } from '@/pages/admin/EmployeeProfilePage';
import { AttendanceEntryPage } from '@/pages/admin/AttendanceEntryPage';
import { DepartmentsPage } from '@/pages/admin/DepartmentsPage';
import { RolesPage } from '@/pages/admin/RolesPage';
import { LoansPage } from '@/pages/admin/LoansPage';
import { AdvanceSalariesPage } from '@/pages/admin/AdvanceSalariesPage';
import { SalaryCalculatePage } from '@/pages/admin/SalaryCalculatePage';
import { SalaryHistoryPage } from '@/pages/admin/SalaryHistoryPage';
import { AuditLogsPage } from '@/pages/admin/AuditLogsPage';
import { EmployeeFormPage } from '@/pages/admin/EmployeeFormPage';
import { EmployeeAttendanceCalendarPage } from '@/pages/admin/EmployeeAttendanceCalendarPage';
import { DailySalaryReleasesPage } from '@/pages/admin/DailySalaryReleasesPage';
import { HolidaysPage } from '@/pages/admin/HolidaysPage';
import { ReportsPage } from '@/pages/admin/ReportsPage';
import { EmployeeDashboardPage } from '@/pages/employee/EmployeeDashboardPage';
import { EmployeeAttendanceEntryPage } from '@/pages/employee/EmployeeAttendanceEntryPage';
import { ErrorBoundary } from '@/components/ErrorBoundary';

/**
 * ProtectedRoute ensures the user is authenticated before rendering children.
 * Redirects to /login if not authenticated.
 */
function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  return <ErrorBoundary>{children}</ErrorBoundary>;
}

/**
 * RoleRoute gates access based on user role.
 * When adminOnly is true, only ADMIN users can access.
 * MANAGER users are redirected to the dashboard.
 */
function RoleRoute({ children, adminOnly = false }: { children: JSX.Element; adminOnly?: boolean }) {
  const { user } = useAuth();
  if (adminOnly && user?.role !== 'ADMIN') {
    return <Navigate to="/admin/dashboard" replace />;
  }
  return children;
}

export default function App() {
  const { isAuthenticated, user } = useAuth();
  // Route to the appropriate dashboard based on user role
  const home = user?.role === 'ADMIN' || user?.role === 'MANAGER' ? '/admin/dashboard' : '/employee/dashboard';

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to={home} replace /> : <LoginPage />}
      />

      {/* ──── Admin/Manager Routes ──── */}

      {/* Dashboard — accessible to both ADMIN and MANAGER */}
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute>
            <AdminDashboardPage />
          </ProtectedRoute>
        }
      />

      {/* Employees list — accessible to both ADMIN and MANAGER */}
      <Route
        path="/admin/employees"
        element={
          <ProtectedRoute>
            <EmployeesPage />
          </ProtectedRoute>
        }
      />

      {/* Employee create — accessible to both ADMIN and MANAGER */}
      {/* NOTE: /new must appear before /:id so React Router does not treat "new" as an ID */}
      <Route
        path="/admin/employees/new"
        element={
          <ProtectedRoute>
            <EmployeeFormPage />
          </ProtectedRoute>
        }
      />

      {/* Employee profile view — accessible to both ADMIN and MANAGER */}
      <Route
        path="/admin/employees/:id"
        element={
          <ProtectedRoute>
            <EmployeeProfilePage />
          </ProtectedRoute>
        }
      />

      {/* Employee edit — ADMIN only */}
      <Route
        path="/admin/employees/:id/edit"
        element={
          <ProtectedRoute>
            <RoleRoute adminOnly>
              <EmployeeFormPage />
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      {/* Employee attendance calendar — accessible to both */}
      <Route
        path="/admin/employees/:id/attendance/calendar"
        element={
          <ProtectedRoute>
            <EmployeeAttendanceCalendarPage />
          </ProtectedRoute>
        }
      />

      {/* Attendance entry — accessible to both ADMIN and MANAGER */}
      <Route
        path="/admin/attendance/entry"
        element={
          <ProtectedRoute>
            <AttendanceEntryPage />
          </ProtectedRoute>
        }
      />

      {/* Departments — accessible to both (mutations are ADMIN-only server side) */}
      <Route
        path="/admin/departments"
        element={
          <ProtectedRoute>
            <DepartmentsPage />
          </ProtectedRoute>
        }
      />

      {/* Roles — accessible to both (mutations are ADMIN-only server side) */}
      <Route
        path="/admin/roles"
        element={
          <ProtectedRoute>
            <RolesPage />
          </ProtectedRoute>
        }
      />

      {/* Loans — accessible to both */}
      <Route
        path="/admin/loans"
        element={
          <ProtectedRoute>
            <LoansPage />
          </ProtectedRoute>
        }
      />

      {/* Advance salaries — accessible to both */}
      <Route
        path="/admin/advance-salaries"
        element={
          <ProtectedRoute>
            <AdvanceSalariesPage />
          </ProtectedRoute>
        }
      />

      {/* Daily releases — accessible to both */}
      <Route
        path="/admin/daily-releases"
        element={
          <ProtectedRoute>
            <DailySalaryReleasesPage />
          </ProtectedRoute>
        }
      />

      {/* Holidays — accessible to both */}
      <Route
        path="/admin/holidays"
        element={
          <ProtectedRoute>
            <HolidaysPage />
          </ProtectedRoute>
        }
      />

      {/* Salary calculation — accessible to both */}
      <Route
        path="/admin/salary/calculate"
        element={
          <ProtectedRoute>
            <SalaryCalculatePage />
          </ProtectedRoute>
        }
      />

      {/* Salary history — accessible to both */}
      <Route
        path="/admin/salary/history"
        element={
          <ProtectedRoute>
            <SalaryHistoryPage />
          </ProtectedRoute>
        }
      />

      {/* Reports & Exports — accessible to both ADMIN and MANAGER */}
      <Route
        path="/admin/reports"
        element={
          <ProtectedRoute>
            <ReportsPage />
          </ProtectedRoute>
        }
      />

      {/* Audit logs — ADMIN only */}
      <Route
        path="/admin/audit-logs"
        element={
          <ProtectedRoute>
            <RoleRoute adminOnly>
              <AuditLogsPage />
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      {/* Admin catch-all redirects to dashboard */}
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute>
            <Navigate to="/admin/dashboard" replace />
          </ProtectedRoute>
        }
      />

      {/* ──── Employee Self-Service Routes ──── */}

      {/* Employee dashboard — accessible to all authenticated users */}
      <Route
        path="/employee/dashboard"
        element={
          <ProtectedRoute>
            <EmployeeDashboardPage />
          </ProtectedRoute>
        }
      />

      {/* Employee attendance entry — accessible to all authenticated users */}
      <Route
        path="/employee/attendance"
        element={
          <ProtectedRoute>
            <EmployeeAttendanceEntryPage />
          </ProtectedRoute>
        }
      />

      {/* Employee catch-all redirects to employee dashboard */}
      <Route
        path="/employee/*"
        element={
          <ProtectedRoute>
            <Navigate to="/employee/dashboard" replace />
          </ProtectedRoute>
        }
      />

      <Route path="/" element={<Navigate to={isAuthenticated ? home : '/login'} replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
