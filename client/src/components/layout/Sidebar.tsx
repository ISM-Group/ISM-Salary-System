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
  Calculator,
  History,
  FileText,
  LogOut,
} from 'lucide-react';

const adminNavItems = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Employees', href: '/admin/employees', icon: Users },
  { label: 'Attendance', href: '/admin/attendance/entry', icon: Calendar },
  { label: 'Departments', href: '/admin/departments', icon: Building2 },
  { label: 'Roles', href: '/admin/roles', icon: Briefcase },
  { label: 'Loans', href: '/admin/loans', icon: CreditCard },
  { label: 'Advance Salaries', href: '/admin/advance-salaries', icon: Wallet },
  { label: 'Salary Calculation', href: '/admin/salary/calculate', icon: Calculator },
  { label: 'Salary History', href: '/admin/salary/history', icon: History },
  { label: 'Audit Logs', href: '/admin/audit-logs', icon: FileText },
];

const employeeNavItems = [
  { label: 'Dashboard', href: '/employee/dashboard', icon: LayoutDashboard },
  { label: 'Attendance', href: '/employee/attendance/entry', icon: Calendar },
];

export function Sidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navItems = user?.role === 'ADMIN' ? adminNavItems : employeeNavItems;

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
        {navItems.map((item) => {
          const isActive =
            location.pathname === item.href ||
            (item.href !== '/admin/dashboard' &&
              item.href !== '/employee/dashboard' &&
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
          <p className="text-xs text-sidebar-muted capitalize">{user?.role}</p>
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
