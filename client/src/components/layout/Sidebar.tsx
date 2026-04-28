import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
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
  FileText,
  LogOut,
  BarChart3,
  UserCog,
  Moon,
  Sun,
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard, adminOnly: false },
  { label: 'Employees', href: '/admin/employees', icon: Users, adminOnly: false },
  { label: 'Attendance', href: '/admin/attendance/entry', icon: Calendar, adminOnly: false },
  { label: 'Departments', href: '/admin/departments', icon: Building2, adminOnly: false },
  { label: 'Roles', href: '/admin/roles', icon: Briefcase, adminOnly: false },
  { label: 'Loans', href: '/admin/loans', icon: CreditCard, adminOnly: false },
  { label: 'Advance Salaries', href: '/admin/advance-salaries', icon: Wallet, adminOnly: false },
  { label: 'Salary Releases', href: '/admin/salary-releases', icon: Banknote, adminOnly: false },
  { label: 'Reports', href: '/admin/reports', icon: BarChart3, adminOnly: false },
  { label: 'Audit Logs', href: '/admin/audit-logs', icon: FileText, adminOnly: true },
  { label: 'User Management', href: '/admin/users', icon: UserCog, adminOnly: true },
];

export function Sidebar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const isAdmin = user?.role === 'ADMIN';

  const visibleNavItems = navItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-white/30 bg-white/50 shadow-lg shadow-indigo-950/5 backdrop-blur-2xl lg:flex dark:border-white/8 dark:bg-slate-950/80">
      <div className="flex h-20 items-center justify-between border-b border-white/25 px-4 py-2 dark:border-white/8">
        <div className="flex items-center gap-2.5">
          <img src="/assets/ism-logo.svg" alt="ISM Group of Company" className="h-16 w-auto" />
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="h-8 w-8 cursor-pointer text-slate-500 hover:bg-white/60 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-white/8 dark:hover:text-slate-200"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {visibleNavItems.map((item) => {
          const isActive =
            location.pathname === item.href ||
            (item.href !== '/admin/dashboard' && location.pathname.startsWith(item.href));

          return (
            <NavLink
              key={item.href}
              to={item.href}
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-200',
                isActive
                  ? 'bg-indigo-500/15 text-indigo-700 ring-1 ring-indigo-500/20 dark:bg-indigo-500/20 dark:text-indigo-400 dark:ring-indigo-500/30'
                  : 'text-slate-600 hover:bg-white/60 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/8 dark:hover:text-slate-100'
              )}
            >
              <item.icon className="h-5 w-5 flex-shrink-0 opacity-80" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-white/30 p-3 dark:border-white/8">
        <div className="mb-3 rounded-xl bg-white/40 px-3 py-2 dark:bg-white/6">
          <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{user?.full_name}</p>
          <p className="text-xs capitalize text-slate-500 dark:text-slate-400">{user?.role?.toLowerCase()}</p>
        </div>
        <Button
          variant="ghost"
          onClick={logout}
          className="w-full cursor-pointer justify-start text-slate-600 hover:bg-white/60 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/8 dark:hover:text-slate-100"
        >
          <LogOut className="h-5 w-5" />
          <span className="ml-3">Logout</span>
        </Button>
      </div>
    </aside>
  );
}
