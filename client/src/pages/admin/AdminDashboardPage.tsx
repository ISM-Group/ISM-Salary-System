import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  Banknote,
  Building2,
  CalendarCheck,
  CreditCard,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PageSkeleton } from '@/components/ui/loading-spinner';
import { dashboardAPI } from '@/lib/api';
import { cn, formatCurrency } from '@/lib/utils';

type DashboardStats = {
  totalEmployees: number;
  activeLoans: {
    count: number;
    total: number;
  };
  pendingAdvances: {
    count: number;
    total: number;
  };
  monthlySalary: {
    total: number;
    trend: number;
  };
};

type SalaryTrend = {
  month: string;
  total: number;
  count: number;
};

type DepartmentDistribution = {
  id: number;
  name: string;
  count: number;
  percentage: number;
};

type AttendanceStat = {
  month: string;
  present: number;
  absent: number;
  total: number;
};

type LoanBreakdown = {
  status: string;
  count: number;
  totalAmount: number;
};

type RecentActivity = {
  id: number;
  action: string;
  timestamp: string;
  user: string;
  userFullName?: string;
};

type InsightRow = {
  factor: string;
  signal: string;
  impact: string;
  status: 'Good' | 'Watch' | 'Review';
};

const chartColors = ['#F29F67', '#34B1AA', '#3B8FF3', '#E0B50F', '#EF4444', '#1E1E2C'];

const compactCurrency = new Intl.NumberFormat('en-LK', {
  style: 'currency',
  currency: 'LKR',
  notation: 'compact',
  maximumFractionDigits: 1,
});

const compactNumber = new Intl.NumberFormat('en-LK', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

const formatMonth = (month: string) => {
  if (!month) return 'N/A';
  const date = new Date(`${month}-01T00:00:00`);
  return new Intl.DateTimeFormat('en-LK', { month: 'short', year: '2-digit' }).format(date);
};

const formatDateTime = (value: string) => {
  if (!value) return 'N/A';
  return new Intl.DateTimeFormat('en-LK', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
};

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex min-h-48 items-center justify-center rounded-lg border border-dashed border-slate-300/80 bg-white/40 px-4 text-center text-sm text-slate-600 dark:border-white/15 dark:bg-white/5 dark:text-slate-400">
      {label}
    </div>
  );
}

function LineTrendChart({ data }: { data: SalaryTrend[] }) {
  if (!data.length) {
    return <EmptyChart label="Salary release trend data will appear after released salary records are available." />;
  }

  const width = 640;
  const height = 220;
  const padding = 28;
  const max = Math.max(...data.map((item) => item.total), 1);
  const points = data.map((item, index) => {
    const x = data.length === 1 ? width / 2 : padding + (index * (width - padding * 2)) / (data.length - 1);
    const y = height - padding - (item.total / max) * (height - padding * 2);
    return { ...item, x, y };
  });
  const path = points.map((point) => `${point.x},${point.y}`).join(' ');
  const areaPath = `${points.map((point) => `${point.x},${point.y}`).join(' ')} ${points[points.length - 1].x},${height - padding} ${points[0].x},${height - padding}`;

  return (
    <div className="space-y-4">
      <svg
        role="img"
        aria-label="Monthly salary released trend line chart"
        viewBox={`0 0 ${width} ${height}`}
        className="h-56 w-full overflow-visible"
      >
        <polygon points={areaPath} fill="rgba(79, 70, 229, 0.10)" />
        {[0, 0.5, 1].map((ratio) => {
          const y = height - padding - ratio * (height - padding * 2);
          return <line key={ratio} x1={padding} x2={width - padding} y1={y} y2={y} stroke="currentColor" className="text-slate-200 dark:text-white/10" />;
        })}
        <polyline points={path} fill="none" stroke="#4f46e5" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point) => (
          <g key={point.month}>
            <circle cx={point.x} cy={point.y} r="5" fill="#ffffff" stroke="#4f46e5" strokeWidth="3" />
            <text x={point.x} y={height - 6} textAnchor="middle" className="fill-slate-500 text-[11px] dark:fill-slate-400">
              {formatMonth(point.month)}
            </text>
          </g>
        ))}
      </svg>
      <div className="grid gap-2 sm:grid-cols-3">
        {points.slice(-3).map((point) => (
          <div key={point.month} className="rounded-lg bg-slate-100/70 p-3 dark:bg-white/5">
            <p className="text-xs text-slate-500 dark:text-slate-400">{formatMonth(point.month)}</p>
            <p className="font-mono text-sm font-semibold text-slate-900 dark:text-slate-100">{compactCurrency.format(point.total)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function DepartmentBarChart({ data }: { data: DepartmentDistribution[] }) {
  const visible = data.filter((item) => item.count > 0).slice(0, 6);

  if (!visible.length) {
    return <EmptyChart label="Department employee distribution will appear when employees are assigned to departments." />;
  }

  const max = Math.max(...visible.map((item) => item.count), 1);

  return (
    <div className="space-y-4" aria-label="Employee distribution by department">
      {visible.map((item, index) => (
        <div key={item.id} className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: chartColors[index % chartColors.length] }} />
              <span className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{item.name}</span>
            </div>
            <span className="font-mono text-xs text-slate-600 dark:text-slate-400">
              {item.count} ({Math.round(item.percentage)}%)
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-slate-200/80 dark:bg-white/10">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.max((item.count / max) * 100, 4)}%`,
                backgroundColor: chartColors[index % chartColors.length],
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function AttendanceBars({ data }: { data: AttendanceStat[] }) {
  if (!data.length) {
    return <EmptyChart label="Attendance analysis will appear after attendance records are entered." />;
  }

  return (
    <div className="space-y-4" aria-label="Monthly attendance stacked bar chart">
      {data.slice(-6).map((item) => {
        const presentRate = item.total ? (item.present / item.total) * 100 : 0;
        const absentRate = item.total ? (item.absent / item.total) * 100 : 0;

        return (
          <div key={item.month} className="space-y-2">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-medium text-slate-800 dark:text-slate-100">{formatMonth(item.month)}</span>
              <span className="font-mono text-xs text-slate-600 dark:text-slate-400">
                {Math.round(presentRate)}% present | {item.total} marks
              </span>
            </div>
            <div className="flex h-4 overflow-hidden rounded-full bg-slate-200/80 dark:bg-white/10">
              <div className="bg-emerald-500" style={{ width: `${presentRate}%` }} aria-label={`${Math.round(presentRate)} percent present`} />
              <div className="bg-rose-500" style={{ width: `${absentRate}%` }} aria-label={`${Math.round(absentRate)} percent absent`} />
            </div>
          </div>
        );
      })}
      <div className="flex flex-wrap gap-3 text-xs text-slate-600 dark:text-slate-400">
        <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" /> Present</span>
        <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-rose-500" /> Absent</span>
      </div>
    </div>
  );
}

function LoanDonut({ data }: { data: LoanBreakdown[] }) {
  const total = data.reduce((sum, item) => sum + item.count, 0);

  if (!total) {
    return <EmptyChart label="Loan status distribution will appear once loan records exist." />;
  }

  let offset = 25;
  const radius = 36;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="grid items-center gap-5 sm:grid-cols-[160px_1fr]">
      <svg role="img" aria-label="Loan status donut chart" viewBox="0 0 100 100" className="mx-auto h-40 w-40 -rotate-90">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="currentColor" strokeWidth="13" className="text-slate-200 dark:text-white/10" />
        {data.map((item, index) => {
          const dash = (item.count / total) * circumference;
          const segment = (
            <circle
              key={item.status}
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke={chartColors[index % chartColors.length]}
              strokeWidth="13"
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={offset}
            />
          );
          offset -= dash;
          return segment;
        })}
      </svg>
      <div className="space-y-3">
        {data.map((item, index) => (
          <div key={item.status} className="flex items-center justify-between gap-3 rounded-lg bg-slate-100/70 p-3 dark:bg-white/5">
            <div className="flex min-w-0 items-center gap-2">
              <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: chartColors[index % chartColors.length] }} />
              <span className="truncate text-sm font-medium capitalize text-slate-800 dark:text-slate-100">{item.status.toLowerCase()}</span>
            </div>
            <div className="text-right">
              <p className="font-mono text-sm font-semibold text-slate-900 dark:text-slate-100">{item.count}</p>
              <p className="font-mono text-xs text-slate-500 dark:text-slate-400">{compactCurrency.format(item.totalAmount)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function getInsights(stats?: DashboardStats, attendance: AttendanceStat[] = [], departments: DepartmentDistribution[] = []): InsightRow[] {
  const latestAttendance = attendance.at(-1);
  const attendanceRate = latestAttendance?.total ? (latestAttendance.present / latestAttendance.total) * 100 : 0;
  const largestDepartment = departments[0];
  const salaryTrend = Number(stats?.monthlySalary?.trend || 0);
  const loanExposure = Number(stats?.activeLoans?.total || 0);
  const monthlySalary = Number(stats?.monthlySalary?.total || 0);
  const pendingAdvanceTotal = Number(stats?.pendingAdvances?.total || 0);

  return [
    {
      factor: 'Salary movement',
      signal: `${salaryTrend >= 0 ? '+' : ''}${salaryTrend.toFixed(1)}% vs previous month`,
      impact: salaryTrend > 15 ? 'Payroll cost is rising faster than usual.' : 'Payroll movement is within a readable range.',
      status: salaryTrend > 15 ? 'Watch' : 'Good',
    },
    {
      factor: 'Attendance quality',
      signal: latestAttendance ? `${Math.round(attendanceRate)}% present in ${formatMonth(latestAttendance.month)}` : 'No attendance month yet',
      impact: attendanceRate && attendanceRate < 85 ? 'Absence pressure may reduce output or affect salary deductions.' : 'Attendance does not currently show a major warning.',
      status: attendanceRate && attendanceRate < 85 ? 'Review' : 'Good',
    },
    {
      factor: 'Loan exposure',
      signal: `${formatCurrency(loanExposure)} active`,
      impact: monthlySalary && loanExposure > monthlySalary ? 'Active loan value is higher than the latest monthly salary release.' : 'Loan value is manageable against salary activity.',
      status: monthlySalary && loanExposure > monthlySalary ? 'Watch' : 'Good',
    },
    {
      factor: 'Advance pressure',
      signal: `${stats?.pendingAdvances?.count || 0} pending, ${formatCurrency(pendingAdvanceTotal)}`,
      impact: pendingAdvanceTotal > 0 ? 'Pending approvals need attention before payroll close.' : 'No pending advance pressure this month.',
      status: pendingAdvanceTotal > 0 ? 'Review' : 'Good',
    },
    {
      factor: 'Department concentration',
      signal: largestDepartment ? `${largestDepartment.name}: ${Math.round(largestDepartment.percentage)}% of employees` : 'No department spread yet',
      impact: largestDepartment && largestDepartment.percentage > 50 ? 'One department carries most staffing capacity.' : 'Staffing is not heavily concentrated in one department.',
      status: largestDepartment && largestDepartment.percentage > 50 ? 'Watch' : 'Good',
    },
  ];
}

export function AdminDashboardPage() {
  const { data: stats, isLoading: isStatsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const response = await dashboardAPI.getStats();
      return response.data as DashboardStats;
    },
  });

  const { data: salaryTrends = [] } = useQuery({
    queryKey: ['dashboard-salary-trends', 8],
    queryFn: async () => {
      const response = await dashboardAPI.getSalaryTrends(8);
      return response.data as SalaryTrend[];
    },
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['dashboard-department-distribution'],
    queryFn: async () => {
      const response = await dashboardAPI.getDepartmentDistribution();
      return response.data as DepartmentDistribution[];
    },
  });

  const { data: attendanceStats = [] } = useQuery({
    queryKey: ['dashboard-attendance-stats', 6],
    queryFn: async () => {
      const response = await dashboardAPI.getAttendanceStats(6);
      return response.data as AttendanceStat[];
    },
  });

  const { data: loanBreakdown = [] } = useQuery({
    queryKey: ['dashboard-loan-breakdown'],
    queryFn: async () => {
      const response = await dashboardAPI.getLoanBreakdown();
      return response.data as LoanBreakdown[];
    },
  });

  const { data: recentActivity = [] } = useQuery({
    queryKey: ['dashboard-recent-activity', 6],
    queryFn: async () => {
      const response = await dashboardAPI.getRecentActivity(6);
      return response.data as RecentActivity[];
    },
  });

  const insightRows = useMemo(() => getInsights(stats, attendanceStats, departments), [stats, attendanceStats, departments]);
  const latestAttendance = attendanceStats.at(-1);
  const latestAttendanceRate = latestAttendance?.total ? Math.round((latestAttendance.present / latestAttendance.total) * 100) : 0;
  const activeLoanAmount = Number(stats?.activeLoans?.total || 0);
  const monthlySalaryTotal = Number(stats?.monthlySalary?.total || 0);
  const exposureRate = monthlySalaryTotal ? Math.round((activeLoanAmount / monthlySalaryTotal) * 100) : 0;

  if (isStatsLoading) {
    return (
      <MainLayout title="Dashboard" description="System analytics at a glance">
        <PageSkeleton variant="dashboard" />
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Dashboard" description="System analytics at a glance">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard staggerIndex={0} title="Employees" value={stats?.totalEmployees || 0} icon={Users} />
          <StatCard
            staggerIndex={1}
            title="Active Loans"
            value={stats?.activeLoans?.count || 0}
            description={formatCurrency(activeLoanAmount)}
            icon={CreditCard}
          />
          <StatCard
            staggerIndex={2}
            title="Monthly Salary"
            value={formatCurrency(monthlySalaryTotal)}
            trend={{
              value: Math.round(Number(stats?.monthlySalary?.trend || 0) * 100) / 100,
              isPositive: Number(stats?.monthlySalary?.trend || 0) >= 0,
            }}
            icon={TrendingUp}
          />
          <StatCard
            staggerIndex={3}
            title="Monthly Advances"
            value={stats?.pendingAdvances?.count || 0}
            description={formatCurrency(stats?.pendingAdvances?.total || 0)}
            icon={Wallet}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CalendarCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Latest Attendance</p>
                <p className="text-xl font-semibold text-slate-900 dark:text-slate-100">{latestAttendance ? `${latestAttendanceRate}% present` : 'No data'}</p>
              </div>
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-700 dark:text-cyan-300">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Departments</p>
                <p className="text-xl font-semibold text-slate-900 dark:text-slate-100">{compactNumber.format(departments.length)} tracked</p>
              </div>
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300">
                <Banknote className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Loan to Salary</p>
                <p className="text-xl font-semibold text-slate-900 dark:text-slate-100">{exposureRate ? `${exposureRate}% exposure` : 'No baseline'}</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
          <Card>
            <CardHeader>
              <CardTitle>Salary Release Trend</CardTitle>
              <CardDescription>Released payroll total by month with recent values for quick comparison.</CardDescription>
            </CardHeader>
            <CardContent>
              <LineTrendChart data={salaryTrends} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Loan Status Mix</CardTitle>
              <CardDescription>Count and value by loan status.</CardDescription>
            </CardHeader>
            <CardContent>
              <LoanDonut data={loanBreakdown} />
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Department Spread</CardTitle>
              <CardDescription>Where active employees are concentrated.</CardDescription>
            </CardHeader>
            <CardContent>
              <DepartmentBarChart data={departments} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Attendance Pattern</CardTitle>
              <CardDescription>Present and absent records across recent months.</CardDescription>
            </CardHeader>
            <CardContent>
              <AttendanceBars data={attendanceStats} />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>Factors That Matter Most</CardTitle>
                <CardDescription>Operational signals calculated from salary, attendance, loans, advances, and staffing.</CardDescription>
              </div>
              {isStatsLoading && <Badge variant="secondary">Loading</Badge>}
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Factor</TableHead>
                    <TableHead>Signal</TableHead>
                    <TableHead>Impact</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {insightRows.map((row) => (
                    <TableRow key={row.factor}>
                      <TableCell className="font-medium text-slate-900 dark:text-slate-100">{row.factor}</TableCell>
                      <TableCell className="font-mono text-xs sm:text-sm">{row.signal}</TableCell>
                      <TableCell className="min-w-64 text-slate-600 dark:text-slate-400">{row.impact}</TableCell>
                      <TableCell>
                        <Badge
                          className={cn(
                            row.status === 'Good' && 'bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300',
                            row.status === 'Watch' && 'bg-amber-500/10 text-amber-700 hover:bg-amber-500/10 dark:text-amber-300',
                            row.status === 'Review' && 'bg-rose-500/10 text-rose-700 hover:bg-rose-500/10 dark:text-rose-300'
                          )}
                        >
                          {row.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/15 text-accent">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Recent System Activity</CardTitle>
                <CardDescription>Latest audit log actions for a quick operational glance.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {recentActivity.length ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Action</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentActivity.map((activity) => (
                      <TableRow key={activity.id}>
                        <TableCell className="font-medium text-slate-900 dark:text-slate-100">{activity.action}</TableCell>
                        <TableCell>{activity.userFullName || activity.user}</TableCell>
                        <TableCell className="font-mono text-xs text-slate-600 dark:text-slate-400">{formatDateTime(activity.timestamp)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <EmptyChart label="Recent audit activity will appear here when users make changes in the system." />
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
