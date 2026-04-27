import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Bell, Menu, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { NavLink, useLocation } from 'react-router-dom';
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

interface HeaderProps {
  title: string;
  description?: string;
}

export function Header({ title, description }: HeaderProps) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isMobile = useIsMobile();
  const location = useLocation();
  const isAdmin = user?.role === 'ADMIN';

  const visibleNavItems = navItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-white/30 bg-white/40 shadow-sm shadow-indigo-950/5 backdrop-blur-xl supports-[backdrop-filter]:bg-white/35 dark:border-white/8 dark:bg-slate-950/60 dark:shadow-indigo-950/20">
        <div className="mx-auto flex h-16 max-w-[2000px] items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            {isMobile && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileMenuOpen(true)}
                className="cursor-pointer lg:hidden dark:text-slate-300 dark:hover:bg-white/8"
              >
                <Menu className="h-5 w-5" />
              </Button>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="truncate bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-lg font-semibold text-transparent sm:text-xl dark:from-slate-100 dark:to-slate-300">
                {title}
              </h1>
              {description && (
                <p className="mt-0.5 hidden truncate text-xs text-slate-600 sm:block dark:text-slate-400">{description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="cursor-pointer text-slate-600 hover:bg-white/60 dark:text-slate-400 dark:hover:bg-white/8"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
            </Button>

            <Button variant="ghost" size="icon" className="relative hidden cursor-pointer sm:flex text-slate-600 dark:text-slate-400 dark:hover:bg-white/8">
              <Bell className="h-5 w-5" />
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-emerald-500" />
            </Button>

            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 cursor-default items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-semibold text-white sm:h-9 sm:w-9 sm:text-sm">
                {user?.full_name?.charAt(0).toUpperCase()}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{user?.full_name}</p>
                <p className="text-xs capitalize text-slate-500 dark:text-slate-400">{user?.role?.toLowerCase()}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Sidebar */}
      {isMobile && (
        <div className={cn('fixed inset-0 z-50 lg:hidden', isMobileMenuOpen ? 'block' : 'hidden')}>
          <button
            type="button"
            className="absolute inset-0 cursor-pointer bg-slate-900/30 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label="Close menu"
          />
          <div className="relative h-full w-72 max-w-[85vw] border-r border-white/30 bg-white/80 shadow-2xl shadow-indigo-950/20 backdrop-blur-2xl dark:border-white/8 dark:bg-slate-950/90">
            <div className="flex h-full flex-col">
              <div className="flex h-16 items-center justify-between border-b border-white/30 px-4 dark:border-white/8">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-bold text-white shadow-sm">
                    ISM
                  </div>
                  <span className="text-[15px] font-semibold text-slate-900 dark:text-slate-100">Salary System</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleTheme}
                  className="cursor-pointer text-slate-600 dark:text-slate-400"
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
                      onClick={() => setIsMobileMenuOpen(false)}
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
                <div className="mb-3 rounded-xl bg-white/50 px-3 py-2 dark:bg-white/6">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{user?.full_name}</p>
                  <p className="text-xs capitalize text-slate-500 dark:text-slate-400">{user?.role?.toLowerCase()}</p>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => { logout(); setIsMobileMenuOpen(false); }}
                  className="w-full cursor-pointer justify-start text-slate-600 hover:bg-white/60 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/8 dark:hover:text-slate-100"
                >
                  <LogOut className="h-5 w-5" />
                  <span className="ml-3">Logout</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
