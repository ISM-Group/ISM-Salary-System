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
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-white/30 bg-white/50 shadow-lg shadow-indigo-950/5 backdrop-blur-2xl lg:flex">
      <div className="flex h-16 items-center border-b border-white/25 px-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-bold text-white shadow-sm">
            ISM
          </div>
          <div>
            <span className="block text-[15px] font-semibold tracking-tight text-slate-900">Salary</span>
            <span className="text-[10px] font-medium uppercase tracking-widest text-slate-500">System</span>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
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
                'flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-200',
                isActive
                  ? 'bg-indigo-500/15 text-indigo-700 ring-1 ring-indigo-500/20'
                  : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
              )}
            >
              <item.icon className="h-5 w-5 flex-shrink-0 opacity-80" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-white/30 p-3">
        <div className="mb-3 rounded-xl bg-white/40 px-3 py-2">
          <p className="truncate text-sm font-medium text-slate-900">{user?.full_name}</p>
          <p className="text-xs capitalize text-slate-500">{user?.role?.toLowerCase()}</p>
        </div>
        <Button
          variant="ghost"
          onClick={logout}
          className="w-full cursor-pointer justify-start text-slate-600 hover:bg-white/60 hover:text-slate-900"
        >
          <LogOut className="h-5 w-5" />
          <span className="ml-3">Logout</span>
        </Button>
      </div>
    </aside>
  );
}
