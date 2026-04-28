import { FormEvent, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { employeesAPI, getApiErrorMessage, loansAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import { PageSkeleton, SummaryCardsSkeleton, TableLoadingRows } from '@/components/ui/loading-spinner';
import { formatCurrency } from '@/lib/utils';
import { AlertCircle } from 'lucide-react';
import { isPositiveNumber } from '@/lib/formValidation';
import { useToast } from '@/hooks/use-toast';

export function LoansPage() {
  const [employeeId, setEmployeeId] = useState('');
  const [loanAmount, setLoanAmount] = useState('');
  const [repaymentMode, setRepaymentMode] = useState<'MONTHLY' | 'DAILY'>('MONTHLY');
  const [numInstallments, setNumInstallments] = useState('12');
  const [dailyRepaymentAmount, setDailyRepaymentAmount] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [page, setPage] = useState(1);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const limit = 20;

  const { data: employeesData, isLoading: isEmployeesLoading } = useQuery({
    queryKey: ['employees-for-loans'],
    queryFn: async () => (await employeesAPI.getAll({ isActive: true })).data,
  });

  const { data: loansResponse, isLoading: isLoansLoading, refetch } = useQuery({
    queryKey: ['loans-admin', statusFilter, page, limit],
    queryFn: async () => {
      const params: Record<string, unknown> = { page, limit };
      if (statusFilter) params.status = statusFilter;
      return await loansAPI.getAll(params);
    },
  });

  const allLoans = loansResponse?.data || [];
  const paginationData = loansResponse?.pagination;

  // Derived display values
  const parsedAmount = Number(loanAmount) || 0;
  const parsedInstallments = Math.max(1, Number(numInstallments) || 1);
  const installmentAmount = repaymentMode === 'MONTHLY' && parsedAmount > 0
    ? parsedAmount / parsedInstallments
    : null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (!employeeId) { setMessage({ type: 'error', text: 'Select an employee.' }); return; }
    if (!isPositiveNumber(loanAmount)) { setMessage({ type: 'error', text: 'Loan amount must be greater than zero.' }); return; }
    if (repaymentMode === 'MONTHLY' && (!numInstallments || Number(numInstallments) < 1)) {
      setMessage({ type: 'error', text: 'Number of months must be at least 1.' }); return;
    }
    if (repaymentMode === 'DAILY' && !isPositiveNumber(dailyRepaymentAmount)) {
      setMessage({ type: 'error', text: 'Daily deduction must be greater than zero.' }); return;
    }

    setSaving(true);
    try {
      await loansAPI.create({
        employeeId,
        loanAmount: Number(loanAmount),
        repaymentMode,
        numInstallments: repaymentMode === 'MONTHLY' ? Number(numInstallments) : undefined,
        dailyRepaymentAmount: repaymentMode === 'DAILY' ? Number(dailyRepaymentAmount) : 0,
      });
      setMessage({ type: 'success', text: 'Loan created successfully.' });
      setEmployeeId('');
      setLoanAmount('');
      setNumInstallments('12');
      setDailyRepaymentAmount('');
      setRepaymentMode('MONTHLY');
      await refetch();
    } catch (err) {
      setMessage({ type: 'error', text: getApiErrorMessage(err, 'Failed to create loan.') });
    } finally {
      setSaving(false);
    }
  };

  const renderModeBadge = (mode: string | undefined) => {
    if (mode === 'DAILY') return <Badge className="bg-blue-100 text-blue-800 border-blue-300">Daily</Badge>;
    return <Badge className="bg-gray-100 text-gray-800 border-gray-300">Monthly</Badge>;
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE': return <Badge className="bg-green-100 text-green-800 border-green-300">Active</Badge>;
      case 'PAID': return <Badge className="bg-blue-100 text-blue-800 border-blue-300">Paid</Badge>;
      case 'CANCELLED': return <Badge className="bg-red-100 text-red-800 border-red-300">Cancelled</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const activeCount = allLoans.filter((l: any) => l.status === 'ACTIVE').length;
  const totalOutstanding = allLoans.filter((l: any) => l.status === 'ACTIVE').reduce((s: number, l: any) => s + Number(l.remainingBalance || 0), 0);
  const dailyActiveCount = allLoans.filter((l: any) => l.status === 'ACTIVE' && l.repaymentMode === 'DAILY').length;
  const totalDailyDeduction = allLoans.filter((l: any) => l.status === 'ACTIVE' && l.repaymentMode === 'DAILY').reduce((s: number, l: any) => s + Number(l.dailyRepaymentAmount || 0), 0);

  if (isEmployeesLoading && isLoansLoading) {
    return (
      <MainLayout title="Loans" description="Manage employee loans with daily or monthly repayment">
        <PageSkeleton variant="form-table" />
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Loans" description="Manage employee loans with daily or monthly repayment">
      <div className="space-y-6">
        {/* Create Loan Form */}
        <Card>
          <CardHeader>
            <CardTitle>Create Loan</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={submit}>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Employee */}
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium">Employee</label>
                  <select
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    required
                  >
                    <option value="">Select employee</option>
                    {(employeesData || []).map((e: any) => (
                      <option key={e.id} value={e.id}>{e.fullName} ({e.employeeId})</option>
                    ))}
                  </select>
                </div>

                {/* Loan Amount */}
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium">Loan Amount (LKR)</label>
                  <Input
                    type="number" min="0" step="0.01"
                    value={loanAmount} onChange={(e) => setLoanAmount(e.target.value)}
                    placeholder="e.g. 50000" required
                  />
                </div>

                {/* Repayment Mode */}
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium">Repayment Mode</label>
                  <select
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={repaymentMode}
                    onChange={(e) => setRepaymentMode(e.target.value as 'MONTHLY' | 'DAILY')}
                  >
                    <option value="MONTHLY">Monthly — deducted from monthly salary</option>
                    <option value="DAILY">Daily — deducted per present day</option>
                  </select>
                </div>

                {/* MONTHLY: number of months */}
                {repaymentMode === 'MONTHLY' && (
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium">Number of Months</label>
                    <Input
                      type="number" min="1" max="120" step="1"
                      value={numInstallments} onChange={(e) => setNumInstallments(e.target.value)}
                      placeholder="e.g. 5" required
                    />
                  </div>
                )}

                {/* DAILY: amount per day */}
                {repaymentMode === 'DAILY' && (
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium">Daily Deduction (LKR)</label>
                    <Input
                      type="number" min="0" step="0.01"
                      value={dailyRepaymentAmount} onChange={(e) => setDailyRepaymentAmount(e.target.value)}
                      placeholder="Amount deducted per present day" required
                    />
                  </div>
                )}
              </div>

              {/* Info panel */}
              <div className="rounded-lg bg-muted/50 border px-4 py-3 text-sm text-muted-foreground">
                {repaymentMode === 'MONTHLY' ? (
                  installmentAmount ? (
                    <>
                      <strong className="text-foreground">Monthly repayment:</strong>{' '}
                      {formatCurrency(installmentAmount)} / month × {parsedInstallments} months = {formatCurrency(parsedAmount)}.
                      {' '}Deducted automatically when the monthly salary release is processed.
                    </>
                  ) : (
                    <>Enter loan amount and number of months to see the installment breakdown.</>
                  )
                ) : (
                  <>
                    <strong className="text-foreground">Daily repayment:</strong>{' '}
                    {dailyRepaymentAmount ? formatCurrency(Number(dailyRepaymentAmount)) : '—'} deducted for every present day.
                    {' '}Absent days are skipped automatically.
                  </>
                )}
              </div>

              {message && (
                <div className={`flex items-center gap-2 rounded-lg p-3 text-sm ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {message.text}
                </div>
              )}

              <Button type="submit" disabled={saving}>{saving ? 'Creating...' : 'Create Loan'}</Button>
            </form>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        {isLoansLoading ? (
          <SummaryCardsSkeleton />
        ) : allLoans.length > 0 && (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Card><CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground uppercase">Active Loans</CardTitle></CardHeader><CardContent><p className="text-lg font-bold">{activeCount}</p></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground uppercase">Outstanding Balance</CardTitle></CardHeader><CardContent><p className="text-lg font-bold text-red-600">{formatCurrency(totalOutstanding)}</p></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground uppercase">Daily Repayment Loans</CardTitle></CardHeader><CardContent><p className="text-lg font-bold text-blue-700">{dailyActiveCount}</p><p className="text-xs text-muted-foreground mt-1">Active daily loans</p></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground uppercase">Total Daily Deduction</CardTitle></CardHeader><CardContent><p className="text-lg font-bold">{formatCurrency(totalDailyDeduction)}</p><p className="text-xs text-muted-foreground mt-1">Per present day</p></CardContent></Card>
          </div>
        )}

        {/* Loan List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Loan List</CardTitle>
              <select
                className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              >
                <option value="">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="PAID">Paid</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead className="text-right">Loan Amount</TableHead>
                    <TableHead className="text-right">Remaining</TableHead>
                    <TableHead className="text-center">Mode</TableHead>
                    <TableHead className="text-right">Installment / Daily</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="w-36 text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoansLoading ? (
                    <TableLoadingRows rows={6} columns={7} />
                  ) : allLoans.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        {statusFilter ? `No ${statusFilter.toLowerCase()} loans found.` : 'No loans found.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    allLoans.map((loan: any) => (
                      <TableRow key={loan.id}>
                        <TableCell className="font-medium">{loan.employeeName}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(loan.loanAmount)}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(loan.remainingBalance)}</TableCell>
                        <TableCell className="text-center">{renderModeBadge(loan.repaymentMode)}</TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {loan.repaymentMode === 'DAILY'
                            ? loan.dailyRepaymentAmount > 0 ? <>{formatCurrency(loan.dailyRepaymentAmount)}<span className="text-muted-foreground text-xs ml-1">/day</span></> : '—'
                            : loan.installmentCount ? <>{formatCurrency(Number(loan.loanAmount) / loan.installmentCount)}<span className="text-muted-foreground text-xs ml-1">×{loan.installmentCount}mo</span></> : '—'
                          }
                        </TableCell>
                        <TableCell className="text-center">{renderStatusBadge(loan.status)}</TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="outline" size="sm"
                            onClick={async () => {
                              const newStatus = loan.status === 'ACTIVE' ? 'PAID' : 'ACTIVE';
                              try {
                                await loansAPI.update(loan.id, { status: newStatus });
                                await refetch();
                                toast({ title: newStatus === 'PAID' ? 'Loan marked paid' : 'Loan reactivated' });
                              } catch (err) {
                                setMessage({ type: 'error', text: getApiErrorMessage(err, 'Failed to update loan.') });
                              }
                            }}
                          >
                            {loan.status === 'ACTIVE' ? 'Mark Paid' : 'Reactivate'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            {paginationData && (
              <Pagination page={paginationData.page} totalPages={paginationData.totalPages} total={paginationData.total} limit={paginationData.limit} onPageChange={setPage} />
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
