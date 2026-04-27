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
import { AuditLogsPage } from '@/pages/admin/AuditLogsPage';
import { EmployeeFormPage } from '@/pages/admin/EmployeeFormPage';
import { EmployeeAttendanceCalendarPage } from '@/pages/admin/EmployeeAttendanceCalendarPage';
import { ReportsPage } from '@/pages/admin/ReportsPage';
import { SalaryReleasesPage } from '@/pages/admin/SalaryReleasesPage';
import { UserManagementPage } from '@/pages/admin/UserManagementPage';
import { ErrorBoundary } from '@/components/ErrorBoundary';

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  return <ErrorBoundary>{children}</ErrorBoundary>;
}

function RoleRoute({ children, adminOnly = false }: { children: JSX.Element; adminOnly?: boolean }) {
  const { user } = useAuth();
  if (adminOnly && user?.role !== 'ADMIN') {
    return <Navigate to="/admin/dashboard" replace />;
  }
  return children;
}

export default function App() {
  const { isAuthenticated, user } = useAuth();
  const home = '/admin/dashboard';

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to={home} replace /> : <LoginPage />}
      />

      <Route path="/admin/dashboard" element={<ProtectedRoute><AdminDashboardPage /></ProtectedRoute>} />
      <Route path="/admin/employees" element={<ProtectedRoute><EmployeesPage /></ProtectedRoute>} />
      <Route path="/admin/employees/new" element={<ProtectedRoute><EmployeeFormPage /></ProtectedRoute>} />
      <Route path="/admin/employees/:id" element={<ProtectedRoute><EmployeeProfilePage /></ProtectedRoute>} />
      <Route path="/admin/employees/:id/edit" element={<ProtectedRoute><RoleRoute adminOnly><EmployeeFormPage /></RoleRoute></ProtectedRoute>} />
      <Route path="/admin/employees/:id/attendance/calendar" element={<ProtectedRoute><EmployeeAttendanceCalendarPage /></ProtectedRoute>} />
      <Route path="/admin/attendance/entry" element={<ProtectedRoute><AttendanceEntryPage /></ProtectedRoute>} />
      <Route path="/admin/departments" element={<ProtectedRoute><DepartmentsPage /></ProtectedRoute>} />
      <Route path="/admin/roles" element={<ProtectedRoute><RolesPage /></ProtectedRoute>} />
      <Route path="/admin/loans" element={<ProtectedRoute><LoansPage /></ProtectedRoute>} />
      <Route path="/admin/advance-salaries" element={<ProtectedRoute><AdvanceSalariesPage /></ProtectedRoute>} />
      <Route path="/admin/salary-releases" element={<ProtectedRoute><SalaryReleasesPage /></ProtectedRoute>} />
      <Route path="/admin/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
      <Route path="/admin/audit-logs" element={<ProtectedRoute><RoleRoute adminOnly><AuditLogsPage /></RoleRoute></ProtectedRoute>} />
      <Route path="/admin/users" element={<ProtectedRoute><RoleRoute adminOnly><UserManagementPage /></RoleRoute></ProtectedRoute>} />

      <Route path="/admin/*" element={<ProtectedRoute><Navigate to="/admin/dashboard" replace /></ProtectedRoute>} />
      <Route path="/" element={<Navigate to={isAuthenticated ? home : '/login'} replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
