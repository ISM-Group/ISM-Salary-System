import { useAuth } from '@/contexts/AuthContext';
import { Bell, Search, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useState, useEffect } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sidebar } from './Sidebar';
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

interface HeaderProps {
  title: string;
  description?: string;
}

export function Header({ title, description }: HeaderProps) {
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isMobile = useIsMobile();
  const location = useLocation();
  const navItems = user?.role === 'admin' ? adminNavItems : employeeNavItems;

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
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetContent side="left" className="w-64 p-0">
            <div className="flex h-full flex-col">
              {/* Logo */}
              <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary">
                    <span className="text-sm font-bold text-sidebar-primary-foreground">ISM</span>
                  </div>
                  <span className="text-lg font-semibold text-sidebar-foreground">Salary System</span>
                </div>
              </div>

              {/* Navigation */}
              <nav className="flex-1 space-y-1 overflow-y-auto p-3">
                {navItems.map((item) => {
                  const isActive = location.pathname === item.href || 
                    (item.href !== '/admin/dashboard' && item.href !== '/employee/dashboard' && location.pathname.startsWith(item.href));
                  
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

              {/* User section */}
              <div className="border-t border-sidebar-border p-3">
                <div className="mb-3 px-3">
                  <p className="text-sm font-medium text-sidebar-foreground">{user?.full_name}</p>
                  <p className="text-xs text-sidebar-muted capitalize">{user?.role}</p>
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
          </SheetContent>
        </Sheet>
      )}
    </>
  );
}
