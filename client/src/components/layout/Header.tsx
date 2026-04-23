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
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            {isMobile && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </Button>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-xl font-semibold text-foreground truncate">{title}</h1>
              {description && (
                <p className="text-xs sm:text-sm text-muted-foreground truncate hidden sm:block">{description}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="relative hidden lg:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search..."
                className="w-64 pl-9"
              />
            </div>
            
            <Button variant="ghost" size="icon" className="relative hidden sm:flex">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-accent" />
            </Button>
            
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-primary text-xs sm:text-sm font-medium text-primary-foreground">
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
            className="absolute inset-0 bg-black/40"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label="Close menu"
          />
          <div className="relative h-full w-64 bg-sidebar-background">
            <div className="flex h-full flex-col">
              <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary">
                    <span className="text-sm font-bold text-sidebar-primary-foreground">ISM</span>
                  </div>
                  <span className="text-lg font-semibold text-sidebar-foreground">Salary System</span>
                </div>
              </div>

              <nav className="flex-1 space-y-1 overflow-y-auto p-3">
                {visibleNavItems.map((item) => {
                  const isActive = location.pathname === item.href || 
                    (item.href !== '/admin/dashboard' && location.pathname.startsWith(item.href));
                  
                  return (
                    <NavLink
                      key={item.href}
                      to={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
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
                  onClick={() => {
                    logout();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full justify-start text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground"
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
