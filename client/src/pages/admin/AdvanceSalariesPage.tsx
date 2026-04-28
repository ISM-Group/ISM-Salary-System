import { FormEvent, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { advanceSalariesAPI, employeesAPI, getApiErrorMessage } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageSkeleton, SummaryCardsSkeleton, TableLoadingRows } from '@/components/ui/loading-spinner';
import { formatCurrency } from '@/lib/utils';
import { isIsoDate, isPositiveNumber } from '@/lib/formValidation';
import { useToast } from '@/hooks/use-toast';

export function AdvanceSalariesPage() {
  const [employeeId, setEmployeeId] = useState('');
  const [amount, setAmount] = useState('');
  const [advanceDate, setAdvanceDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: employeesData, isLoading: isEmployeesLoading } = useQuery({
    queryKey: ['employees-for-advance'],
    queryFn: async () => (await employeesAPI.getAll({ isActive: true })).data,
  });
  const { data: advanceData, isLoading: isAdvancesLoading, refetch } = useQuery({
    queryKey: ['advance-salaries-admin'],
    queryFn: async () => (await advanceSalariesAPI.getAll({})).data,
  });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!employeeId) { setError('Select an employee.'); return; }
    if (!isPositiveNumber(amount)) { setError('Advance amount must be greater than zero.'); return; }
    if (!isIsoDate(advanceDate)) { setError('Select a valid advance date.'); return; }

    setSaving(true);
    try {
      // status omitted — backend defaults to APPROVED
      await advanceSalariesAPI.create({ employeeId, amount: Number(amount), advanceDate, notes: notes.trim() });
      setEmployeeId('');
      setAmount('');
      setAdvanceDate(new Date().toISOString().slice(0, 10));
      setNotes('');
      await refetch();
      toast({ title: 'Advance recorded' });
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to record advance.'));
    } finally {
      setSaving(false);
    }
  };

  const allRecords = advanceData || [];
  const totalAmount = allRecords.reduce((s: number, r: any) => s + Number(r.amount || 0), 0);

  if (isEmployeesLoading && isAdvancesLoading) {
    return (
      <MainLayout title="Advance Salaries" description="Record salary advances given to employees">
        <PageSkeleton variant="form-table" />
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Advance Salaries" description="Record salary advances given to employees">
      <div className="space-y-6">
        {/* Create Advance Form */}
        <Card>
          <CardHeader>
            <CardTitle>Record Advance</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 md:grid-cols-2 lg:grid-cols-5" onSubmit={submit}>
              {error && (
                <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 md:col-span-2 lg:col-span-5">
                  {error}
                </p>
              )}
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
              <Input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount (LKR)" required />
              <Input type="date" value={advanceDate} onChange={(e) => setAdvanceDate(e.target.value)} required />
              <Input placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
              <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Record Advance'}</Button>
            </form>
            <p className="mt-2 text-xs text-muted-foreground">
              Advances are immediately active and will be deducted from the next salary release covering the advance date.
            </p>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        {isAdvancesLoading ? (
          <SummaryCardsSkeleton />
        ) : allRecords.length > 0 && (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground uppercase">Total Advances</CardTitle></CardHeader>
              <CardContent><p className="text-lg font-bold">{allRecords.length}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground uppercase">Total Amount</CardTitle></CardHeader>
              <CardContent><p className="text-lg font-bold">{formatCurrency(totalAmount)}</p></CardContent>
            </Card>
          </div>
        )}

        {/* Advance List */}
        <Card>
          <CardHeader>
            <CardTitle>Advance List</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-center w-24">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isAdvancesLoading ? (
                    <TableLoadingRows rows={6} columns={5} />
                  ) : allRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">No advance records found.</TableCell>
                    </TableRow>
                  ) : (
                    allRecords.map((row: any) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">{row.employeeName}</TableCell>
                        <TableCell>{new Date(row.advanceDate).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(row.amount)}</TableCell>
                        <TableCell className="max-w-[200px] truncate text-muted-foreground">{row.notes || '—'}</TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-300 hover:bg-red-50"
                            onClick={async () => {
                              if (!window.confirm('Delete this advance record?')) return;
                              try {
                                await advanceSalariesAPI.delete(row.id);
                                await refetch();
                                toast({ title: 'Advance deleted' });
                              } catch (err) {
                                setError(getApiErrorMessage(err, 'Failed to delete advance.'));
                              }
                            }}
                          >
                            Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
