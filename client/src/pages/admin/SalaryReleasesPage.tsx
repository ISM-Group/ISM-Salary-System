import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { salaryReleasesAPI, employeesAPI, departmentsAPI, getApiErrorMessage } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageSkeleton, TableLoadingRows } from '@/components/ui/loading-spinner';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Plus, Eye, Trash2, CheckCircle, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';

type PreviewData = {
  employeeId: string;
  salaryType: string;
  releaseType: string;
  workingDays: number;
  grossAmount: number;
  absentDeduction?: number;
  advanceDeductions: number;
  loanDeductions: number;
  bonus: number;
  calculatedNet: number;
  releasedAmount: number;
  absentDays?: number;
  paidOffs?: number;
  excessAbsent?: number;
  dayBreakdown?: DayEntry[];
  averageDailyRate?: number;
  error?: string;
};

type DayEntry = {
  date: string;
  status: string;
  roleName: string | null;
  personalRate: number;
  roleDailyWage: number;
  effectiveRate: number;
  amount: number;
};

type Release = {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  departmentName: string;
  periodStart: string;
  periodEnd: string;
  releaseType: string;
  salaryType: string;
  workingDays: number;
  grossAmount: number;
  absentDeduction: number;
  advanceDeductions: number;
  loanDeductions: number;
  bonus: number;
  calculatedNet: number;
  releasedAmount: number;
  status: string;
  notes: string | null;
};

type WizardStep = 'select' | 'preview' | 'confirm';

function today() { return new Date().toISOString().slice(0, 10); }
function thisMonthStart() { return new Date().toISOString().slice(0, 7) + '-01'; }
function thisMonthEnd() {
  const d = new Date(); return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
}
function thisWeekStart() {
  const d = new Date(); d.setDate(d.getDate() - d.getDay() + 1); return d.toISOString().slice(0, 10);
}
function thisWeekEnd() {
  const d = new Date(); d.setDate(d.getDate() - d.getDay() + 7); return d.toISOString().slice(0, 10);
}

export function SalaryReleasesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // List filters
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [page, setPage] = useState(1);

  // Wizard state
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState<WizardStep>('select');
  const [wizardEmployeeIds, setWizardEmployeeIds] = useState<string[]>([]);
  const [wizardPeriodStart, setWizardPeriodStart] = useState(thisMonthStart());
  const [wizardPeriodEnd, setWizardPeriodEnd] = useState(thisMonthEnd());
  const [wizardBonus, setWizardBonus] = useState('0');
  const [wizardNotes, setWizardNotes] = useState('');
  const [wizardReleasedOverrides, setWizardReleasedOverrides] = useState<Record<string, string>>({});
  const [previews, setPreviews] = useState<PreviewData[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [expandedDays, setExpandedDays] = useState<string | null>(null);

  // Detail view
  const [detailId, setDetailId] = useState<string | null>(null);

  const { data: releasesRes, isLoading } = useQuery({
    queryKey: ['salary-releases', filterFrom, filterTo, filterStatus, filterDept, page],
    queryFn: async () => {
      const params: Record<string, unknown> = { page, limit: 30 };
      if (filterFrom) params.from = filterFrom;
      if (filterTo) params.to = filterTo;
      if (filterStatus) params.status = filterStatus;
      if (filterDept) params.departmentId = filterDept;
      return salaryReleasesAPI.getAll(params);
    },
  });

  const { data: detailRes } = useQuery({
    queryKey: ['salary-release-detail', detailId],
    enabled: !!detailId,
    queryFn: () => salaryReleasesAPI.getById(detailId!),
  });

  const { data: employeesRes, isLoading: isEmployeesLoading } = useQuery({
    queryKey: ['employees-active'],
    queryFn: async () => {
      const r = await employeesAPI.getAll({ isActive: true });
      return r.data as any[];
    },
  });

  const { data: departmentsRes, isLoading: isDepartmentsLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const r = await departmentsAPI.getAll();
      return r.data as any[];
    },
  });

  const releases: Release[] = releasesRes?.data || [];
  const totalReleases: number = releasesRes?.total || 0;
  const employees: any[] = employeesRes || [];

  const releaseMutation = useMutation({
    mutationFn: (id: string) => salaryReleasesAPI.release(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-releases'] });
      toast({ title: 'Payment released' });
    },
    onError: (err) => toast({ title: getApiErrorMessage(err), variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => salaryReleasesAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-releases'] });
      toast({ title: 'Release deleted' });
    },
    onError: (err) => toast({ title: getApiErrorMessage(err), variant: 'destructive' }),
  });

  const createMutation = useMutation({
    mutationFn: (items: any[]) => salaryReleasesAPI.batchCreate({
      employeeIds: items.map((p) => p.employeeId),
      periodStart: wizardPeriodStart,
      periodEnd: wizardPeriodEnd,
      bonus: Number(wizardBonus) || 0,
      notes: wizardNotes || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-releases'] });
      toast({ title: `${previews.length} release(s) created as DRAFT` });
      resetWizard();
    },
    onError: (err) => toast({ title: getApiErrorMessage(err), variant: 'destructive' }),
  });

  const resetWizard = () => {
    setShowWizard(false);
    setWizardStep('select');
    setWizardEmployeeIds([]);
    setPreviews([]);
    setWizardBonus('0');
    setWizardNotes('');
    setWizardReleasedOverrides({});
    setPreviewError('');
  };

  const loadPreview = async () => {
    if (!wizardEmployeeIds.length) {
      setPreviewError('Select at least one employee.');
      return;
    }
    setPreviewError('');
    setPreviewLoading(true);
    try {
      let result: PreviewData[];
      if (wizardEmployeeIds.length === 1) {
        const r = await salaryReleasesAPI.preview({
          employeeId: wizardEmployeeIds[0],
          periodStart: wizardPeriodStart,
          periodEnd: wizardPeriodEnd,
          bonus: Number(wizardBonus) || 0,
        });
        result = [r.data];
      } else {
        const r = await salaryReleasesAPI.batchPreview({
          employeeIds: wizardEmployeeIds,
          periodStart: wizardPeriodStart,
          periodEnd: wizardPeriodEnd,
          bonus: Number(wizardBonus) || 0,
        });
        result = r.data;
      }
      setPreviews(result);
      setWizardReleasedOverrides({});
      setWizardStep('preview');
    } catch (err) {
      setPreviewError(getApiErrorMessage(err, 'Preview failed'));
    } finally {
      setPreviewLoading(false);
    }
  };

  const toggleEmployee = (id: string) => {
    setWizardEmployeeIds((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    );
  };

  const selectAll = () => setWizardEmployeeIds(employees.map((e) => e.id));
  const clearAll = () => setWizardEmployeeIds([]);

  const statusBadge = (status: string) =>
    status === 'RELEASED'
      ? <Badge variant="outline" className="border-green-300 bg-green-50 text-green-700">Released</Badge>
      : <Badge variant="outline" className="border-yellow-300 bg-yellow-50 text-yellow-700">Draft</Badge>;

  const detail = detailRes?.data;
  const isInitialLoading = isLoading && isEmployeesLoading && isDepartmentsLoading;

  return (
    <MainLayout title="Salary Releases" description="Manage all salary payments — daily, weekly, monthly, or custom periods">
      {isInitialLoading ? (
        <PageSkeleton variant="table" />
      ) : (
      <>
      <div className="space-y-4">
        {/* Filters + New button */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">From</label>
            <Input type="date" value={filterFrom} onChange={(e) => { setFilterFrom(e.target.value); setPage(1); }} className="w-36" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">To</label>
            <Input type="date" value={filterTo} onChange={(e) => { setFilterTo(e.target.value); setPage(1); }} className="w-36" />
          </div>
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
          >
            <option value="">All statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="RELEASED">Released</option>
          </select>
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={filterDept}
            onChange={(e) => { setFilterDept(e.target.value); setPage(1); }}
          >
            <option value="">All departments</option>
            {(departmentsRes || []).map((d: any) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <div className="ml-auto">
            <Button onClick={() => { setShowWizard(true); setWizardStep('select'); }}>
              <Plus className="h-4 w-4 mr-1" /> New Release
            </Button>
          </div>
        </div>

        {/* Releases table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Working Days</TableHead>
                  <TableHead>Gross</TableHead>
                  <TableHead>Deductions</TableHead>
                  <TableHead>Released</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableLoadingRows rows={5} columns={9} />
                )}
                {!isLoading && releases.length === 0 && (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-gray-400">No releases found</TableCell></TableRow>
                )}
                {releases.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="font-medium text-sm">{r.employeeName}</div>
                      <div className="text-xs text-gray-500">{r.employeeCode} · {r.departmentName}</div>
                    </TableCell>
                    <TableCell className="text-sm">
                      <div>{r.periodStart}</div>
                      <div className="text-xs text-gray-400">→ {r.periodEnd}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {r.releaseType}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{r.workingDays}</TableCell>
                    <TableCell className="font-mono text-sm">{formatCurrency(r.grossAmount)}</TableCell>
                    <TableCell className="font-mono text-sm text-red-600">
                      -{formatCurrency(Number(r.absentDeduction || 0) + Number(r.advanceDeductions || 0) + Number(r.loanDeductions || 0))}
                    </TableCell>
                    <TableCell className="font-mono text-sm font-semibold">{formatCurrency(r.releasedAmount)}</TableCell>
                    <TableCell>{statusBadge(r.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setDetailId(r.id)}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        {r.status === 'DRAFT' && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-green-600 hover:text-green-700"
                              onClick={() => releaseMutation.mutate(r.id)}
                              disabled={releaseMutation.isPending}
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-500 hover:text-red-600"
                              onClick={() => deleteMutation.mutate(r.id)}
                              disabled={deleteMutation.isPending}
                            >
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
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalReleases > 30 && (
          <div className="flex items-center gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Prev</Button>
            <span className="text-sm text-gray-600">Page {page} · {totalReleases} total</span>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page * 30 >= totalReleases}>Next</Button>
          </div>
        )}
      </div>

      {/* Detail drawer */}
      {detailId && detail && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={() => setDetailId(null)}>
          <div className="w-full max-w-xl bg-white h-full overflow-y-auto p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Release Detail</h2>
              <Button variant="ghost" size="sm" onClick={() => setDetailId(null)}>✕</Button>
            </div>
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-gray-500">Employee</span><div className="font-medium">{detail.employeeName}</div></div>
                <div><span className="text-gray-500">Period</span><div className="font-medium">{detail.period_start} → {detail.period_end}</div></div>
                <div><span className="text-gray-500">Type</span><div className="font-medium">{detail.release_type} / {detail.salary_type}</div></div>
                <div><span className="text-gray-500">Status</span><div>{statusBadge(detail.status)}</div></div>
                <div><span className="text-gray-500">Working Days</span><div className="font-mono">{detail.working_days}</div></div>
                <div><span className="text-gray-500">Gross</span><div className="font-mono">{formatCurrency(detail.gross_amount)}</div></div>
                <div><span className="text-gray-500">Absent Deduction</span><div className="font-mono text-red-600">-{formatCurrency(detail.absent_deduction)}</div></div>
                <div><span className="text-gray-500">Advance Deductions</span><div className="font-mono text-red-600">-{formatCurrency(detail.advance_deductions)}</div></div>
                <div><span className="text-gray-500">Loan Deductions</span><div className="font-mono text-red-600">-{formatCurrency(detail.loan_deductions)}</div></div>
                <div><span className="text-gray-500">Bonus</span><div className="font-mono text-green-600">+{formatCurrency(detail.bonus)}</div></div>
                <div><span className="text-gray-500">Calculated Net</span><div className="font-mono font-semibold">{formatCurrency(detail.calculated_net)}</div></div>
                <div><span className="text-gray-500">Released Amount</span><div className="font-mono font-bold text-accent">{formatCurrency(detail.released_amount)}</div></div>
              </div>
              {detail.notes && <div><span className="text-gray-500">Notes:</span> {detail.notes}</div>}

              {/* Day breakdown for DAILY_WAGE */}
              {detail.salary_type === 'DAILY_WAGE' && detail.dayBreakdown?.length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-700 mb-2">Day-by-Day Breakdown</h3>
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Personal</TableHead>
                          <TableHead>Role Rate</TableHead>
                          <TableHead>Effective</TableHead>
                          <TableHead>Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detail.dayBreakdown.map((d: DayEntry) => (
                          <TableRow key={d.date} className={d.status === 'ABSENT' ? 'opacity-40' : ''}>
                            <TableCell className="text-xs">{d.date}</TableCell>
                            <TableCell className="text-xs">{d.roleName || '-'}</TableCell>
                            <TableCell className="font-mono text-xs">{formatCurrency(d.personalRate)}</TableCell>
                            <TableCell className="font-mono text-xs">{formatCurrency(d.roleDailyWage)}</TableCell>
                            <TableCell className="font-mono text-xs font-medium">{formatCurrency(d.effectiveRate)}</TableCell>
                            <TableCell className="font-mono text-xs">{d.status === 'PRESENT' ? formatCurrency(d.amount) : 'Absent'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* New Release Wizard */}
      {showWizard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">New Salary Release</h2>
              <Button variant="ghost" size="sm" onClick={resetWizard}>✕</Button>
            </div>

            {/* Step indicators */}
            <div className="flex gap-1 px-6 py-3 bg-gray-50 border-b text-xs font-medium">
              {(['select', 'preview', 'confirm'] as WizardStep[]).map((step, i) => (
                <span key={step} className={`rounded-full px-3 py-1 ${wizardStep === step ? 'bg-accent text-accent-foreground' : 'text-gray-400'}`}>
                  {i + 1}. {step.charAt(0).toUpperCase() + step.slice(1)}
                </span>
              ))}
            </div>

            <div className="p-6 max-h-[70vh] overflow-y-auto">

              {/* Step 1: Select employees + period */}
              {wizardStep === 'select' && (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">Period Start</label>
                      <Input type="date" value={wizardPeriodStart} onChange={(e) => setWizardPeriodStart(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">Period End</label>
                      <Input type="date" value={wizardPeriodEnd} onChange={(e) => setWizardPeriodEnd(e.target.value)} />
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" variant="outline" onClick={() => { setWizardPeriodStart(today()); setWizardPeriodEnd(today()); }}>Today</Button>
                    <Button size="sm" variant="outline" onClick={() => { setWizardPeriodStart(thisWeekStart()); setWizardPeriodEnd(thisWeekEnd()); }}>This Week</Button>
                    <Button size="sm" variant="outline" onClick={() => { setWizardPeriodStart(thisMonthStart()); setWizardPeriodEnd(thisMonthEnd()); }}>This Month</Button>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Bonus (applies to all selected)</label>
                    <Input type="number" min="0" step="0.01" value={wizardBonus} onChange={(e) => setWizardBonus(e.target.value)} className="w-40" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-gray-700">Select Employees ({wizardEmployeeIds.length} selected)</label>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={selectAll}>All Active</Button>
                        <Button size="sm" variant="outline" onClick={clearAll}>Clear</Button>
                      </div>
                    </div>
                    <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                      {employees.map((emp) => (
                        <label key={emp.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50">
                          <input
                            type="checkbox"
                            checked={wizardEmployeeIds.includes(emp.id)}
                            onChange={() => toggleEmployee(emp.id)}
                          />
                          <span className="text-sm">{emp.fullName}</span>
                          <span className="text-xs text-gray-400 ml-auto">{emp.employeeId} · {emp.salaryType}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  {previewError && <p className="text-sm text-red-600">{previewError}</p>}
                  <div className="flex justify-end">
                    <Button onClick={loadPreview} disabled={previewLoading}>
                      {previewLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Loading Preview...</> : 'Preview →'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 2: Preview */}
              {wizardStep === 'preview' && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Period: <strong>{wizardPeriodStart}</strong> → <strong>{wizardPeriodEnd}</strong>
                  </p>
                  {previews.map((p) => {
                    const emp = employees.find((e) => e.id === p.employeeId);
                    const isExpanded = expandedDays === p.employeeId;
                    return (
                      <div key={p.employeeId} className="border rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-medium">{emp?.fullName || p.employeeId}</span>
                            <Badge variant="outline" className="ml-2 text-xs">{p.salaryType}</Badge>
                            <Badge variant="outline" className="ml-1 text-xs">{p.releaseType}</Badge>
                          </div>
                          <div className="font-mono font-bold text-accent">{formatCurrency(p.calculatedNet)}</div>
                        </div>
                        {p.error && <p className="text-sm text-red-600">{p.error}</p>}
                        {!p.error && (
                          <div className="grid grid-cols-3 gap-2 text-sm">
                            <div><span className="text-gray-500">Working Days</span><div className="font-medium">{p.workingDays}</div></div>
                            <div><span className="text-gray-500">Gross</span><div className="font-mono">{formatCurrency(p.grossAmount)}</div></div>
                            {p.salaryType === 'FIXED' && (
                              <div><span className="text-gray-500">Absent (paid {p.paidOffs}/excess {p.excessAbsent})</span><div className="font-mono text-red-600">-{formatCurrency(p.absentDeduction || 0)}</div></div>
                            )}
                            {p.salaryType === 'DAILY_WAGE' && p.averageDailyRate !== undefined && (
                              <div><span className="text-gray-500">Avg Daily Rate</span><div className="font-mono">{formatCurrency(p.averageDailyRate)}</div></div>
                            )}
                            <div><span className="text-gray-500">Advances</span><div className="font-mono text-red-600">-{formatCurrency(p.advanceDeductions)}</div></div>
                            <div><span className="text-gray-500">Loans</span><div className="font-mono text-red-600">-{formatCurrency(p.loanDeductions)}</div></div>
                            <div><span className="text-gray-500">Bonus</span><div className="font-mono text-green-600">+{formatCurrency(p.bonus)}</div></div>
                          </div>
                        )}
                        {!p.error && (
                          <div className="flex items-center gap-3 pt-2 border-t">
                            <label className="text-sm text-gray-600">Override released amount:</label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              className="w-36 h-8 text-sm"
                              value={wizardReleasedOverrides[p.employeeId] ?? p.releasedAmount}
                              onChange={(e) => setWizardReleasedOverrides((prev) => ({ ...prev, [p.employeeId]: e.target.value }))}
                            />
                          </div>
                        )}
                        {p.salaryType === 'DAILY_WAGE' && p.dayBreakdown && p.dayBreakdown.length > 0 && (
                          <button
                            className="flex items-center gap-1 text-xs text-info"
                            onClick={() => setExpandedDays(isExpanded ? null : p.employeeId)}
                          >
                            {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            {isExpanded ? 'Hide' : 'Show'} day breakdown
                          </button>
                        )}
                        {isExpanded && p.dayBreakdown && (
                          <div className="rounded border overflow-hidden">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Date</TableHead>
                                  <TableHead>Role</TableHead>
                                  <TableHead>Personal</TableHead>
                                  <TableHead>Role Rate</TableHead>
                                  <TableHead>Effective</TableHead>
                                  <TableHead>Amount</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {p.dayBreakdown.map((d) => (
                                  <TableRow key={d.date} className={d.status === 'ABSENT' ? 'opacity-40' : ''}>
                                    <TableCell className="text-xs">{d.date}</TableCell>
                                    <TableCell className="text-xs">{d.roleName || '-'}</TableCell>
                                    <TableCell className="font-mono text-xs">{formatCurrency(d.personalRate)}</TableCell>
                                    <TableCell className="font-mono text-xs">{formatCurrency(d.roleDailyWage)}</TableCell>
                                    <TableCell className="font-mono text-xs font-medium">{formatCurrency(d.effectiveRate)}</TableCell>
                                    <TableCell className="font-mono text-xs">{d.status === 'PRESENT' ? formatCurrency(d.amount) : 'Absent'}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <div className="flex gap-2 justify-between pt-2">
                    <Button variant="outline" onClick={() => setWizardStep('select')}>← Back</Button>
                    <Button onClick={() => setWizardStep('confirm')}>Confirm →</Button>
                  </div>
                </div>
              )}

              {/* Step 3: Confirm */}
              {wizardStep === 'confirm' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Notes (optional)</label>
                    <textarea
                      className="w-full h-20 rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
                      placeholder="Notes for these releases..."
                      value={wizardNotes}
                      onChange={(e) => setWizardNotes(e.target.value)}
                    />
                  </div>
                  <div className="rounded-lg border p-4 space-y-2">
                    <p className="text-sm font-medium">Summary</p>
                    {previews.filter((p) => !p.error).map((p) => {
                      const emp = employees.find((e) => e.id === p.employeeId);
                      const released = Number(wizardReleasedOverrides[p.employeeId] ?? p.releasedAmount);
                      return (
                        <div key={p.employeeId} className="flex justify-between text-sm">
                          <span className="text-gray-600">{emp?.fullName}</span>
                          <span className="font-mono font-medium">{formatCurrency(released)}</span>
                        </div>
                      );
                    })}
                    <div className="border-t pt-2 flex justify-between font-semibold">
                      <span>Total</span>
                      <span className="font-mono">
                        {formatCurrency(
                          previews.filter((p) => !p.error).reduce(
                            (sum, p) => sum + Number(wizardReleasedOverrides[p.employeeId] ?? p.releasedAmount),
                            0
                          )
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-between pt-2">
                    <Button variant="outline" onClick={() => setWizardStep('preview')}>← Back</Button>
                    <Button
                      onClick={() => createMutation.mutate(previews.filter((p) => !p.error))}
                      disabled={createMutation.isPending}
                    >
                      {createMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating...</> : 'Create as DRAFT'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      </>
      )}
    </MainLayout>
  );
}
