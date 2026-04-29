import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { PageLoading } from '@/components/ui/loading-spinner';
import {
  ArrowLeft, Edit, Calendar, DollarSign, TrendingUp, CreditCard,
  Wallet, Plus, CheckCircle, Trash2, ExternalLink, UserRound,
} from 'lucide-react';
import { employeesAPI, salaryReleasesAPI, salaryHistoryAPI, loansAPI, advanceSalariesAPI, exportsAPI, getApiErrorMessage, getApiResourceUrl } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

type Tab = 'overview' | 'calendar' | 'releases' | 'increments' | 'loans' | 'advances';

const TABS: { key: Tab; label: string; icon: any }[] = [
  { key: 'overview', label: 'Overview', icon: null },
  { key: 'calendar', label: 'Calendar', icon: Calendar },
  { key: 'releases', label: 'Releases', icon: DollarSign },
  { key: 'increments', label: 'Increments', icon: TrendingUp },
  { key: 'loans', label: 'Loans', icon: CreditCard },
  { key: 'advances', label: 'Advances', icon: Wallet },
];

function calendarMonthDays(year: number, month: number): (string | null)[] {
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const offset = firstDay === 0 ? 6 : firstDay - 1; // Mon=0
  const cells: (string | null)[] = Array(offset).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  }
  return cells;
}

export function EmployeeProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('overview');

  // Calendar state
  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth() + 1);

  // Increment modal
  const [showIncrementModal, setShowIncrementModal] = useState(false);
  const [incEffectiveFrom, setIncEffectiveFrom] = useState(new Date().toISOString().slice(0, 10));
  const [incSalaryType, setIncSalaryType] = useState<'FIXED' | 'DAILY_WAGE'>('DAILY_WAGE');
  const [incBaseSalary, setIncBaseSalary] = useState('');
  const [incReason, setIncReason] = useState('');
  const [incNotes, setIncNotes] = useState('');
  const [incError, setIncError] = useState('');

  const { data: profileData, isLoading } = useQuery({
    queryKey: ['employee-profile', id],
    queryFn: async () => {
      const r = await employeesAPI.getProfile(id!);
      return r.data;
    },
    enabled: !!id,
  });

  const { data: releasesRes } = useQuery({
    queryKey: ['employee-releases', id],
    queryFn: () => salaryReleasesAPI.getByEmployee(id!),
    enabled: tab === 'releases',
  });

  const { data: incRes } = useQuery({
    queryKey: ['employee-salary-history', id],
    queryFn: () => salaryHistoryAPI.getByEmployee(id!),
    enabled: tab === 'increments',
  });

  const { data: calendarRes } = useQuery({
    queryKey: ['employee-calendar', id, calYear, calMonth],
    queryFn: () =>
      salaryReleasesAPI.getEmployeeCalendar(id!, `${calYear}-${String(calMonth).padStart(2, '0')}`),
    enabled: tab === 'calendar',
  });

  const addIncrementMutation = useMutation({
    mutationFn: () =>
      salaryHistoryAPI.create(id!, {
        effectiveFrom: incEffectiveFrom,
        salaryType: incSalaryType,
        baseSalary: Number(incBaseSalary),
        reason: incReason,
        notes: incNotes || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-salary-history', id] });
      setShowIncrementModal(false);
      setIncBaseSalary(''); setIncReason(''); setIncNotes(''); setIncError('');
      toast({ title: 'Increment added' });
    },
    onError: (err) => setIncError(getApiErrorMessage(err, 'Failed to add increment')),
  });

  const releaseMutation = useMutation({
    mutationFn: (releaseId: string) => salaryReleasesAPI.release(releaseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-releases', id] });
      toast({ title: 'Payment released' });
    },
    onError: (err) => toast({ title: getApiErrorMessage(err), variant: 'destructive' }),
  });

  const deleteReleaseMutation = useMutation({
    mutationFn: (releaseId: string) => salaryReleasesAPI.delete(releaseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-releases', id] });
      toast({ title: 'Release deleted' });
    },
    onError: (err) => toast({ title: getApiErrorMessage(err), variant: 'destructive' }),
  });

  if (isLoading) {
    return (
      <MainLayout title="Employee Profile" description="Loading...">
        <PageLoading text="Loading employee profile..." />
      </MainLayout>
    );
  }

  if (!profileData) {
    return (
      <MainLayout title="Employee Profile" description="Not found">
        <div className="text-center py-8">
          <p className="text-gray-500">Employee not found</p>
          <Button onClick={() => navigate('/admin/employees')} className="mt-4">Back to Employees</Button>
        </div>
      </MainLayout>
    );
  }

  const { employee, salaryPromotions, loans, advances, attendanceSummary } = profileData;

  // Build calendar data
  const calData = calendarRes?.data;
  const attendanceByDate: Record<string, any> = {};
  // Normalize date keys — MySQL DATE may arrive as full ISO string or Date object
  (calData?.attendance || []).forEach((a: any) => {
    const key = String(a.date).slice(0, 10);
    attendanceByDate[key] = a;
  });
  const calDays = calendarMonthDays(calYear, calMonth);
  const monthLabel = new Date(calYear, calMonth - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const prevMonth = () => { if (calMonth === 1) { setCalYear((y) => y - 1); setCalMonth(12); } else setCalMonth((m) => m - 1); };
  const nextMonth = () => { if (calMonth === 12) { setCalYear((y) => y + 1); setCalMonth(1); } else setCalMonth((m) => m + 1); };

  const releases: any[] = releasesRes?.data || [];
  const increments: any[] = incRes?.data || [];

  const statusBadge = (s: string) =>
    s === 'RELEASED'
      ? <Badge variant="outline" className="border-green-300 text-green-700 bg-green-50">Released</Badge>
      : <Badge variant="outline" className="border-yellow-300 text-yellow-700 bg-yellow-50">Draft</Badge>;

  return (
    <MainLayout title="Employee Profile" description={`${employee.fullName} — ${employee.department?.name || ''}`}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin/employees')}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
              {employee.photoUrl ? (
                <img src={getApiResourceUrl(employee.photoUrl)} alt={`${employee.fullName} photo`} className="h-full w-full object-cover" />
              ) : (
                <UserRound className="h-7 w-7 text-muted-foreground" />
              )}
            </div>
            <div>
              <h1 className="text-xl font-semibold">{employee.fullName}</h1>
              <p className="text-sm text-gray-500">{employee.employeeId} · {employee.department?.name} · {employee.role?.name || 'No role'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={employee.isActive ? 'default' : 'secondary'}>{employee.isActive ? 'Active' : 'Inactive'}</Badge>
            <Badge variant="outline" className={employee.salaryType === 'FIXED' ? 'border-accent/50 text-accent' : 'border-info/50 text-info'}>
              {employee.salaryType}
            </Badge>
            <Link to={`/admin/employees/${id}/edit`}>
              <Button variant="outline" size="sm"><Edit className="h-3.5 w-3.5 mr-1" /> Edit</Button>
            </Link>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex border-b">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key
                  ? 'border-accent text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab: Overview */}
        {tab === 'overview' && (
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-base">Personal Details</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Phone</span><span>{employee.phone || '-'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Hire Date</span><span>{new Date(employee.hireDate).toLocaleDateString()}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">City</span><span>{employee.address?.city || '-'}</span></div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Salary Configuration</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Type</span><Badge variant="outline">{employee.salaryType}</Badge></div>
                <div className="flex justify-between"><span className="text-gray-500">Base Rate</span><span className="font-mono font-medium">{formatCurrency(employee.baseSalary || employee.role?.dailyWage || 0)}{employee.salaryType === 'DAILY_WAGE' ? '/day' : '/month'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Primary Role</span><span>{employee.role?.name || '-'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Department</span><span>{employee.department?.name || '-'}</span></div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Attendance (Last 3 Months)</CardTitle></CardHeader>
              <CardContent className="text-sm">
                <div className="grid grid-cols-2 gap-4 mt-1">
                  <div className="rounded-lg bg-green-50 p-3 text-center">
                    <p className="text-xs text-gray-500">Present</p>
                    <p className="text-2xl font-bold text-green-700">{attendanceSummary?.presentDays ?? 0}</p>
                  </div>
                  <div className="rounded-lg bg-red-50 p-3 text-center">
                    <p className="text-xs text-gray-500">Absent</p>
                    <p className="text-2xl font-bold text-red-600">{attendanceSummary?.absentDays ?? 0}</p>
                  </div>
                </div>
                <div className="mt-3 text-right">
                  <Link to={`/admin/employees/${id}/attendance/calendar`} className="flex items-center justify-end gap-1 text-xs text-info hover:underline">
                    Full calendar <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Quick Links</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => setTab('releases')}>
                  <DollarSign className="h-4 w-4 mr-2" /> View Salary Releases
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => setTab('increments')}>
                  <TrendingUp className="h-4 w-4 mr-2" /> Manage Increments
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => {
                    const token = localStorage.getItem('token');
                    const month = new Date().toISOString().slice(0, 7);
                    const url = exportsAPI.getPayslipUrl(id!, month) + `&token=${token}`;
                    window.open(url, '_blank');
                  }}
                >
                  <ExternalLink className="h-4 w-4 mr-2" /> Open Latest Payslip
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tab: Calendar */}
        {tab === 'calendar' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={prevMonth}>←</Button>
              <span className="font-medium">{monthLabel}</span>
              <Button variant="outline" size="sm" onClick={nextMonth}>→</Button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-400 mb-1">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calDays.map((date, i) => {
                if (!date) return <div key={i} />;
                const att = attendanceByDate[date];
                const day = parseInt(date.slice(8), 10);
                const isPresent = att?.status === 'PRESENT';
                const isAbsent = att?.status === 'ABSENT';
                const hasRecord = !!att;

                return (
                  <div
                    key={date}
                    title={att ? `${att.status}${att.roleName ? ` — ${att.roleName}` : ''}` : 'No record'}
                    className={[
                      'rounded-lg border p-2 min-h-[64px] flex flex-col items-center justify-start gap-1 text-xs transition-colors',
                      isPresent
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                        : isAbsent
                          ? 'bg-red-50 border-red-300 text-red-900'
                          : 'bg-white border-gray-100 text-gray-300',
                    ].join(' ')}
                  >
                    <span className={[
                      'font-semibold text-sm leading-none',
                      isPresent ? 'text-emerald-700' : isAbsent ? 'text-red-600' : 'text-gray-300',
                    ].join(' ')}>
                      {day}
                    </span>
                    {isPresent && (
                      <span className="mt-1 text-[10px] font-medium text-emerald-600 leading-none">Present</span>
                    )}
                    {isAbsent && (
                      <span className="mt-1 text-[10px] font-medium text-red-500 leading-none">Absent</span>
                    )}
                    {hasRecord && att.roleName && (
                      <span className="text-[9px] truncate max-w-full opacity-60 leading-none">{att.roleName}</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 rounded border border-emerald-300 bg-emerald-50" />
                Present
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 rounded border border-red-300 bg-red-50" />
                Absent
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 rounded border border-gray-100 bg-white" />
                No record
              </span>
            </div>
            {/* Release bars */}
            {(calData?.releases || []).length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-sm">Releases in {monthLabel}</CardTitle></CardHeader>
                <CardContent>
                  {calData.releases.map((r: any) => (
                    <div key={r.id} className="flex items-center justify-between py-1.5 border-b last:border-0 text-sm">
                      <div>
                        <Badge variant="outline" className="text-xs mr-2">{r.releaseType}</Badge>
                        {r.periodStart} → {r.periodEnd}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium">{formatCurrency(r.releasedAmount)}</span>
                        {statusBadge(r.status)}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Tab: Releases */}
        {tab === 'releases' && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-medium text-gray-700">Salary Release History</h2>
              <Link to="/admin/salary-releases">
                <Button size="sm" variant="outline"><Plus className="h-3.5 w-3.5 mr-1" /> New Release</Button>
              </Link>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Working Days</TableHead>
                  <TableHead>Gross</TableHead>
                  <TableHead>Released</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {releases.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center py-6 text-gray-400">No releases yet</TableCell></TableRow>
                )}
                {releases.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm">{r.periodStart} → {r.periodEnd}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{r.releaseType}</Badge></TableCell>
                    <TableCell>{r.workingDays}</TableCell>
                    <TableCell className="font-mono">{formatCurrency(r.grossAmount)}</TableCell>
                    <TableCell className="font-mono font-semibold">{formatCurrency(r.releasedAmount)}</TableCell>
                    <TableCell>{statusBadge(r.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {r.status === 'DRAFT' && (
                          <>
                            <Button size="sm" variant="ghost" className="text-green-600" onClick={() => releaseMutation.mutate(r.id)}>
                              <CheckCircle className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" className="text-red-500" onClick={() => deleteReleaseMutation.mutate(r.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Tab: Increments */}
        {tab === 'increments' && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-medium text-gray-700">Salary Increment History</h2>
              <Button size="sm" onClick={() => setShowIncrementModal(true)}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Increment
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Effective From</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Changed By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {increments.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center py-6 text-gray-400">No increments yet</TableCell></TableRow>
                )}
                {increments.map((inc: any) => (
                  <TableRow key={inc.id}>
                    <TableCell>{new Date(inc.effectiveFrom).toLocaleDateString()}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{inc.salaryType}</Badge></TableCell>
                    <TableCell className="font-mono font-medium">{formatCurrency(inc.baseSalary)}{inc.salaryType === 'DAILY_WAGE' ? '/day' : '/month'}</TableCell>
                    <TableCell className="text-sm">{inc.reason}</TableCell>
                    <TableCell className="text-sm text-gray-500">{inc.changedBy?.fullName || inc.changedBy?.username || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Tab: Loans */}
        {tab === 'loans' && (
          <div className="space-y-3">
            <div className="flex justify-between">
              <h2 className="text-sm font-medium text-gray-700">Loans</h2>
              <Link to="/admin/loans"><Button size="sm" variant="outline"><Plus className="h-3.5 w-3.5 mr-1" /> Add Loan</Button></Link>
            </div>
            {(!loans || loans.length === 0) && <p className="text-sm text-gray-400 py-4">No loans on record</p>}
            {(loans || []).map((loan: any) => (
              <Card key={loan.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-medium">{formatCurrency(loan.loanAmount)} — {loan.repaymentMode}</p>
                      <p className="text-sm text-gray-500">Balance: <span className="font-mono font-medium">{formatCurrency(loan.remainingBalance)}</span></p>
                    </div>
                    <Badge variant={loan.status === 'ACTIVE' ? 'default' : 'secondary'}>{loan.status}</Badge>
                  </div>
                  {loan.installments?.slice(0, 5).map((inst: any) => (
                    <div key={inst.id} className="flex justify-between text-xs py-1 border-t">
                      <span>#{inst.installmentNumber} {new Date(inst.dueMonth).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                      <span className={inst.status === 'PAID' ? 'text-green-600' : 'text-gray-500'}>
                        {formatCurrency(inst.amount)} ({inst.status})
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Tab: Advances */}
        {tab === 'advances' && (
          <div className="space-y-3">
            <div className="flex justify-between">
              <h2 className="text-sm font-medium text-gray-700">Advance Salaries</h2>
              <Link to="/admin/advance-salaries"><Button size="sm" variant="outline"><Plus className="h-3.5 w-3.5 mr-1" /> Add Advance</Button></Link>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Slip</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(!advances || advances.length === 0) && (
                  <TableRow><TableCell colSpan={5} className="text-center py-6 text-gray-400">No advances on record</TableCell></TableRow>
                )}
                {(advances || []).map((adv: any) => (
                  <TableRow key={adv.id}>
                    <TableCell>{new Date(adv.advanceDate).toLocaleDateString()}</TableCell>
                    <TableCell className="font-mono font-medium">{formatCurrency(adv.amount)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        adv.status === 'APPROVED' ? 'text-green-700 border-green-300' :
                        adv.status === 'REJECTED' ? 'text-red-600 border-red-300' : 'text-yellow-700 border-yellow-300'
                      }>{adv.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {adv.slipPhotoUrl && (
                        <a href={adv.slipPhotoUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-info hover:underline">
                          View <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">{adv.notes || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Add Increment Modal */}
      {showIncrementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold mb-4">Add Salary Increment</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Effective From</label>
                <Input type="date" value={incEffectiveFrom} onChange={(e) => setIncEffectiveFrom(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Salary Type</label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={incSalaryType}
                  onChange={(e) => setIncSalaryType(e.target.value as 'FIXED' | 'DAILY_WAGE')}
                >
                  <option value="DAILY_WAGE">Daily Wage</option>
                  <option value="FIXED">Fixed Monthly</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  New Rate ({incSalaryType === 'DAILY_WAGE' ? 'per day' : 'per month'})
                </label>
                <Input type="number" min="0" step="0.01" value={incBaseSalary} onChange={(e) => setIncBaseSalary(e.target.value)} placeholder="e.g. 2000" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Reason</label>
                <Input value={incReason} onChange={(e) => setIncReason(e.target.value)} placeholder="e.g. Annual increment, promotion" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Notes (optional)</label>
                <Input value={incNotes} onChange={(e) => setIncNotes(e.target.value)} placeholder="Optional notes" />
              </div>
              {incError && <p className="text-sm text-red-600">{incError}</p>}
            </div>
            <div className="flex gap-2 mt-5">
              <Button
                className="flex-1"
                onClick={() => {
                  setIncError('');
                  if (!incBaseSalary || Number(incBaseSalary) <= 0) { setIncError('Enter a valid rate'); return; }
                  if (!incReason) { setIncError('Reason is required'); return; }
                  addIncrementMutation.mutate();
                }}
                disabled={addIncrementMutation.isPending}
              >
                {addIncrementMutation.isPending ? 'Adding...' : 'Add Increment'}
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => { setShowIncrementModal(false); setIncError(''); }}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
