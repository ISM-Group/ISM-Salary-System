import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { dashboardAPI } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/dashboard/StatCard';
import { Calendar, CreditCard, TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export function EmployeeDashboardPage() {
  const { data: attendanceData } = useQuery({
    queryKey: ['employee-attendance-stats'],
    queryFn: async () => (await dashboardAPI.getAttendanceStats(3)).data,
  });
  const { data: loanData } = useQuery({
    queryKey: ['employee-loan-breakdown'],
    queryFn: async () => (await dashboardAPI.getLoanBreakdown()).data,
  });
  const { data: salaryTrends } = useQuery({
    queryKey: ['employee-salary-trends'],
    queryFn: async () => (await dashboardAPI.getSalaryTrends(6)).data,
  });

  const latestAttendance = attendanceData?.[attendanceData.length - 1];
  const latestSalary = salaryTrends?.[salaryTrends.length - 1];
  const activeLoans = (loanData || []).find((x: any) => x.status === 'ACTIVE');

  return (
    <MainLayout title="Employee Dashboard" description="Your payroll and attendance snapshot">
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Latest Attendance Total"
          value={latestAttendance?.total || 0}
          description={latestAttendance?.month || 'No data'}
          icon={Calendar}
        />
        <StatCard
          title="Latest Salary Batch"
          value={formatCurrency(latestSalary?.total || 0)}
          description={latestSalary?.month || 'No data'}
          icon={TrendingUp}
        />
        <StatCard
          title="Active Loan Count"
          value={activeLoans?.count || 0}
          description={formatCurrency(activeLoans?.totalAmount || 0)}
          icon={CreditCard}
        />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Note</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Employee-side analytics are active and secured. Role-based filtering can be tightened further once user-to-employee mapping is finalized in your production DB.
        </CardContent>
      </Card>
    </MainLayout>
  );
}
