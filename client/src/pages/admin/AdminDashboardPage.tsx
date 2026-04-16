import { useQuery } from '@tanstack/react-query';
import { Users, Wallet, CreditCard, TrendingUp } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { dashboardAPI } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

export function AdminDashboardPage() {
  const { data } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const response = await dashboardAPI.getStats();
      return response.data;
    },
  });

  return (
    <MainLayout title="Dashboard" description="Organization overview">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Employees" value={data?.totalEmployees || 0} icon={Users} />
        <StatCard
          title="Active Loans"
          value={data?.activeLoans?.count || 0}
          description={formatCurrency(data?.activeLoans?.total || 0)}
          icon={CreditCard}
        />
        <StatCard
          title="Monthly Salary"
          value={formatCurrency(data?.monthlySalary?.total || 0)}
          trend={{
            value: Math.round(Number(data?.monthlySalary?.trend || 0) * 100) / 100,
            isPositive: Number(data?.monthlySalary?.trend || 0) >= 0,
          }}
          icon={TrendingUp}
        />
        <StatCard
          title="Monthly Advances"
          value={data?.pendingAdvances?.count || 0}
          description={formatCurrency(data?.pendingAdvances?.total || 0)}
          icon={Wallet}
        />
      </div>
    </MainLayout>
  );
}
