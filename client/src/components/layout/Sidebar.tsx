import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Calendar,
  Building2,
  Briefcase,
  CreditCard,
  Wallet,
  Banknote,
  Calculator,
  History,
  FileText,
  LogOut,
  CalendarDays,
  BarChart3,
} from 'lucide-react';

/**
 * Navigation items for the admin sidebar.
 * Both ADMIN and MANAGER roles see these items, with the exception of
 * Audit Logs which is conditionally hidden for MANAGER users.
 */
const navItems = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard, adminOnly: false },
  { label: 'Employees', href: '/admin/employees', icon: Users, adminOnly: false },
  { label: 'Attendance', href: '/admin/attendance/entry', icon: Calendar, adminOnly: false },
  { label: 'Departments', href: '/admin/departments', icon: Building2, adminOnly: false },
  { label: 'Roles', href: '/admin/roles', icon: Briefcase, adminOnly: false },
  { label: 'Loans', href: '/admin/loans', icon: CreditCard, adminOnly: false },
  { label: 'Advance Salaries', href: '/admin/advance-salaries', icon: Wallet, adminOnly: false },
  { label: 'Daily Releases', href: '/admin/daily-releases', icon: Banknote, adminOnly: false },
  { label: 'Holidays', href: '/admin/holidays', icon: CalendarDays, adminOnly: false },
  { label: 'Salary Calculation', href: '/admin/salary/calculate', icon: Calculator, adminOnly: false },
  { label: 'Salary History', href: '/admin/salary/history', icon: History, adminOnly: false },
  { label: 'Reports', href: '/admin/reports', icon: BarChart3, adminOnly: false },
  { label: 'Audit Logs', href: '/admin/audit-logs', icon: FileText, adminOnly: true },
];

// PUBLIC_INTERFACE
/**
 * Sidebar component displaying navigation links for the ISM Salary System.
 * Both ADMIN and MANAGER users see the same navigation, with Audit Logs
 * hidden from MANAGER users. Renders the ISM branding, user info, and logout.
 */
export function Sidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const isAdmin = user?.role === 'ADMIN';

  // Filter nav items based on role — hide adminOnly items from MANAGER
  const visibleNavItems = navItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-sidebar-border bg-sidebar-background lg:flex lg:flex-col">
      <div className="flex h-16 items-center border-b border-sidebar-border px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary">
            <span className="text-sm font-bold text-sidebar-primary-foreground">ISM</span>
          </div>
          <span className="text-lg font-semibold text-sidebar-foreground">Salary System</span>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {visibleNavItems.map((item) => {
          const isActive =
            location.pathname === item.href ||
            (item.href !== '/admin/dashboard' &&
              location.pathname.startsWith(item.href));

          return (
            <NavLink
              key={item.href}
              to={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                  : 'text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground'
              )}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <div className="mb-3 px-3">
          <p className="text-sm font-medium text-sidebar-foreground">{user?.full_name}</p>
          <p className="text-xs text-sidebar-muted capitalize">{user?.role?.toLowerCase()}</p>
        </div>
        <Button
          variant="ghost"
          onClick={logout}
          className="w-full justify-start text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          <LogOut className="h-5 w-5" />
          <span className="ml-3">Logout</span>
        </Button>
      </div>
    </aside>
  );
}
