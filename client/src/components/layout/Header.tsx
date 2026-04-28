import { useAuth } from '@/contexts/AuthContext';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
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
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isMobile = useIsMobile();
  const location = useLocation();
  const isAdmin = user?.role === 'ADMIN';

  const visibleNavItems = navItems.filter((item) => !item.adminOnly || isAdmin);

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  // Format date and time
  const formatDate = () => {
    return currentTime.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = () => {
    return currentTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border bg-background/92 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/82">
        <div className="mx-auto max-w-[2000px] px-4 sm:px-6">
          {/* Time and Date Section */}
          <div className="flex items-center justify-between border-b border-border/50 py-2">
            <div className="text-sm text-muted-foreground">
              <span>{formatDate()}</span>
              <span className="mx-2">•</span>
              <span>{formatTime()}</span>
            </div>
            <div className="text-sm font-medium text-foreground">
              {getGreeting()}, {user?.full_name?.split(' ')[0]}!
            </div>
          </div>

          {/* Main Header Content */}
          <div className="flex h-16 items-center justify-between">
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
                <h1 className="truncate text-lg font-semibold text-foreground sm:text-xl">
                  {title}
                </h1>
                {description && (
                  <p className="mt-0.5 hidden truncate text-xs text-muted-foreground sm:block">{description}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 cursor-default items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground sm:h-9 sm:w-9 sm:text-sm dark:bg-accent dark:text-accent-foreground">
                  {user?.full_name?.charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-foreground">{user?.full_name}</p>
                  <p className="text-xs capitalize text-muted-foreground">{user?.role?.toLowerCase()}</p>
                </div>
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
          <div className="relative h-full w-72 max-w-[85vw] border-r border-sidebar-border bg-sidebar shadow-2xl">
            <div className="flex h-full flex-col">
              <div className="flex h-20 items-center justify-between border-b border-sidebar-border px-4 py-2">
                <div className="flex items-center gap-2.5">
                  <img src="/assets/ism-logo.png" alt="ISM Group of Company" className="h-16 w-auto" />
                </div>
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
                        'flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors duration-200',
                        isActive
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                          : 'text-sidebar-muted hover:bg-sidebar-accent/70 hover:text-sidebar-foreground'
                      )}
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0 opacity-80" />
                      <span>{item.label}</span>
                    </NavLink>
                  );
                })}
              </nav>

              <div className="border-t border-sidebar-border p-3">
                <div className="mb-3 rounded-md bg-sidebar-accent/60 px-3 py-2">
                  <p className="text-sm font-medium text-sidebar-foreground">{user?.full_name}</p>
                  <p className="text-xs capitalize text-sidebar-muted">{user?.role?.toLowerCase()}</p>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => { logout(); setIsMobileMenuOpen(false); }}
                  className="w-full cursor-pointer justify-start text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground"
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
