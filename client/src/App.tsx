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
import { EmployeeDashboardPage } from '@/pages/employee/EmployeeDashboardPage';
import { EmployeeAttendanceEntryPage } from '@/pages/employee/EmployeeAttendanceEntryPage';

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  return children;
}

function RoleRoute({ children, adminOnly = false }: { children: JSX.Element; adminOnly?: boolean }) {
  const { user } = useAuth();
  if (adminOnly && user?.role !== 'ADMIN') {
    return <Navigate to="/employee/dashboard" replace />;
  }
  return children;
}

export default function App() {
  const { isAuthenticated, user } = useAuth();
  const home = user?.role === 'ADMIN' ? '/admin/dashboard' : '/employee/dashboard';

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to={home} replace /> : <LoginPage />}
      />

      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute>
            <RoleRoute adminOnly>
              <AdminDashboardPage />
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/employees"
        element={
          <ProtectedRoute>
            <RoleRoute adminOnly>
              <EmployeesPage />
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/employees/:id"
        element={
          <ProtectedRoute>
            <RoleRoute adminOnly>
              <EmployeeProfilePage />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/employees/new"
        element={
          <ProtectedRoute>
            <RoleRoute adminOnly>
              <EmployeeFormPage />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
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
      <Route
        path="/admin/employees/:id/attendance/calendar"
        element={
          <ProtectedRoute>
            <RoleRoute adminOnly>
              <EmployeeAttendanceCalendarPage />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/attendance/entry"
        element={
          <ProtectedRoute>
            <RoleRoute adminOnly>
              <AttendanceEntryPage />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/departments"
        element={
          <ProtectedRoute>
            <RoleRoute adminOnly>
              <DepartmentsPage />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/roles"
        element={
          <ProtectedRoute>
            <RoleRoute adminOnly>
              <RolesPage />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/loans"
        element={
          <ProtectedRoute>
            <RoleRoute adminOnly>
              <LoansPage />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/advance-salaries"
        element={
          <ProtectedRoute>
            <RoleRoute adminOnly>
              <AdvanceSalariesPage />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/salary/calculate"
        element={
          <ProtectedRoute>
            <RoleRoute adminOnly>
              <SalaryCalculatePage />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/salary/history"
        element={
          <ProtectedRoute>
            <RoleRoute adminOnly>
              <SalaryHistoryPage />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
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

      <Route
        path="/admin/*"
        element={
          <ProtectedRoute>
            <RoleRoute adminOnly>
              <Navigate to="/admin/dashboard" replace />
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/employee/dashboard"
        element={
          <ProtectedRoute>
            <EmployeeDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/employee/attendance/entry"
        element={
          <ProtectedRoute>
            <EmployeeAttendanceEntryPage />
          </ProtectedRoute>
        }
      />
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
