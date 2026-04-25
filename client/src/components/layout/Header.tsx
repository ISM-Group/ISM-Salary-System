import { useAuth } from '@/contexts/AuthContext';
import { Bell, Search, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Calculator,
  History,
  FileText,
  LogOut,
  CalendarDays,
} from 'lucide-react';

/**
 * Navigation items for the mobile menu header.
 * Mirrors the Sidebar navItems structure with adminOnly flag.
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
  { label: 'Audit Logs', href: '/admin/audit-logs', icon: FileText, adminOnly: true },
];

interface HeaderProps {
  title: string;
  description?: string;
}

// PUBLIC_INTERFACE
/**
 * Header component with page title and a mobile navigation menu.
 * Both ADMIN and MANAGER users see the same navigation, with Audit Logs
 * hidden from MANAGER users. Includes search, notifications, and user avatar.
 */
export function Header({ title, description }: HeaderProps) {
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isMobile = useIsMobile();
  const location = useLocation();
  const isAdmin = user?.role === 'ADMIN';

  // Filter nav items based on role — hide adminOnly items from MANAGER
  const visibleNavItems = navItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-white/30 bg-white/40 shadow-sm shadow-indigo-950/5 backdrop-blur-xl supports-[backdrop-filter]:bg-white/35">
        <div className="mx-auto flex h-16 max-w-[2000px] items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            {isMobile && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileMenuOpen(true)}
                className="cursor-pointer lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </Button>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="truncate bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-lg font-semibold text-transparent sm:text-xl">
                {title}
              </h1>
              {description && (
                <p className="mt-0.5 hidden truncate text-xs text-slate-600 sm:block">{description}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="relative hidden lg:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                placeholder="Search..."
                className="h-9 w-64 border-white/40 bg-white/50 pl-9 text-slate-800 placeholder:text-slate-500"
              />
            </div>
            
            <Button variant="ghost" size="icon" className="relative hidden cursor-pointer sm:flex">
              <Bell className="h-5 w-5 text-slate-600" />
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-emerald-500" />
            </Button>
            
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex h-8 w-8 cursor-default items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-semibold text-white sm:h-9 sm:w-9 sm:text-sm">
                {user?.full_name?.charAt(0).toUpperCase()}
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
          <div className="relative h-full w-72 max-w-[85vw] border-r border-white/30 bg-white/75 shadow-2xl shadow-indigo-950/20 backdrop-blur-2xl">
            <div className="flex h-full flex-col">
              <div className="flex h-16 items-center border-b border-white/30 px-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-bold text-white shadow-sm">
                    ISM
                  </div>
                  <span className="text-[15px] font-semibold text-slate-900">Salary System</span>
                </div>
              </div>

              <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
                {visibleNavItems.map((item) => {
                  const isActive = location.pathname === item.href || 
                    (item.href !== '/admin/dashboard' && location.pathname.startsWith(item.href));
                  
                  return (
                    <NavLink
                      key={item.href}
                      to={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
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
                <div className="mb-3 rounded-xl bg-white/50 px-3 py-2">
                  <p className="text-sm font-medium text-slate-900">{user?.full_name}</p>
                  <p className="text-xs capitalize text-slate-500">{user?.role?.toLowerCase()}</p>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => {
                    logout();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full cursor-pointer justify-start text-slate-600 hover:bg-white/60 hover:text-slate-900"
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
