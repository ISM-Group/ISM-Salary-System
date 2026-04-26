import { FormEvent, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { advanceSalariesAPI, employeesAPI, getApiErrorMessage } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';
import { CheckCircle, XCircle, Filter } from 'lucide-react';
import { isIsoDate, isPositiveNumber } from '@/lib/formValidation';
import { useToast } from '@/hooks/use-toast';

/**
 * AdvanceSalariesPage — Manages salary advance records with approval workflow.
 *
 * Shows a form to create advances and a table listing all advances.
 * Each advance has a status (APPROVED, PENDING, REJECTED) that determines
 * whether it will be deducted from daily salary releases.
 * - Only APPROVED advances are deducted from daily salary releases.
 * - Daily releases skip ABSENT days for loan deductions; advances are date-specific.
 * Admin can approve or reject PENDING advances directly from the table.
 * Includes status filtering to help manage the approval workflow.
 */
// PUBLIC_INTERFACE
export function AdvanceSalariesPage() {
  const [employeeId, setEmployeeId] = useState('');
  const [amount, setAmount] = useState('');
  const [advanceDate, setAdvanceDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: employeesData } = useQuery({
    queryKey: ['employees-for-advance'],
    queryFn: async () => {
      const response = await employeesAPI.getAll({ isActive: true });
      return response.data;
    },
  });
  const { data: advanceData, refetch } = useQuery({
    queryKey: ['advance-salaries-admin', statusFilter],
    queryFn: async () => {
      const params: Record<string, unknown> = {};
      if (statusFilter) {
        params.status = statusFilter;
      }
      const response = await advanceSalariesAPI.getAll(params);
      return response.data;
    },
  });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!employeeId) {
      setMessage('Select an employee.');
      return;
    }
    if (!isPositiveNumber(amount)) {
      setMessage('Advance amount must be greater than zero.');
      return;
    }
    if (!isIsoDate(advanceDate)) {
      setMessage('Select a valid advance date.');
      return;
    }

    setSaving(true);
    setMessage(null);
    const formData = new FormData();
    formData.append('employeeId', employeeId);
    formData.append('amount', amount);
    formData.append('advanceDate', advanceDate);
    formData.append('notes', notes.trim());
    try {
      await advanceSalariesAPI.create(formData);
      setEmployeeId('');
      setAmount('');
      setNotes('');
      await refetch();
      toast({ title: 'Advance salary created' });
    } catch (err) {
      setMessage(getApiErrorMessage(err, 'Failed to create advance salary.'));
    } finally {
      setSaving(false);
    }
  };

  /**
   * Handles updating advance salary status (approve/reject).
   * Only APPROVED advances are deducted from daily salary releases.
   */
  const handleStatusUpdate = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    setUpdatingId(id);
    try {
      await advanceSalariesAPI.updateStatus(id, status);
      await refetch();
      toast({ title: status === 'APPROVED' ? 'Advance approved' : 'Advance rejected' });
    } catch (err) {
      setMessage(getApiErrorMessage(err, 'Failed to update advance status.'));
    } finally {
      setUpdatingId(null);
    }
  };

  /**
   * Returns a styled badge for the given advance status.
   */
  const renderStatusBadge = (status: string | null | undefined) => {
    switch (status) {
      case 'APPROVED':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-300">Approved</Badge>
        );
      case 'PENDING':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">Pending</Badge>
        );
      case 'REJECTED':
        return (
          <Badge className="bg-red-100 text-red-800 border-red-300">Rejected</Badge>
        );
      default:
        return (
          <Badge className="bg-green-100 text-green-800 border-green-300">Approved</Badge>
        );
    }
  };

  // Calculate summary counts from the data
  const allRecords = advanceData || [];
  const pendingCount = allRecords.filter((r: any) => r.status === 'PENDING').length;
  const approvedCount = allRecords.filter((r: any) => r.status === 'APPROVED').length;
  const rejectedCount = allRecords.filter((r: any) => r.status === 'REJECTED').length;
  const totalApproved = allRecords
    .filter((r: any) => r.status === 'APPROVED')
    .reduce((sum: number, r: any) => sum + Number(r.amount || 0), 0);

  return (
    <MainLayout title="Advance Salaries" description="Track salary advances. Only APPROVED advances are deducted from daily releases.">
      <div className="space-y-6">
        {/* Create Advance Form */}
        <Card>
          <CardHeader>
            <CardTitle>Create Advance Salary</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 md:grid-cols-5" onSubmit={submit}>
              {message && (
                <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 md:col-span-5">
                  {message}
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
                  <option key={e.id} value={e.id}>
                    {e.fullName} ({e.employeeId})
                  </option>
                ))}
              </select>
              <Input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" required />
              <Input type="date" value={advanceDate} onChange={(e) => setAdvanceDate(e.target.value)} required />
              <Input placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
              <Button type="submit" disabled={saving}>{saving ? 'Creating...' : 'Create'}</Button>
            </form>
            <p className="mt-2 text-xs text-gray-500">
              New advances default to APPROVED status and are immediately deducted from daily salary releases on the advance date.
              Rejected advances are excluded from deductions.
            </p>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        {allRecords.length > 0 && (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-gray-500 uppercase">
                  Pending Approval
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-bold text-yellow-700">{pendingCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-gray-500 uppercase">
                  Approved
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-bold text-green-700">{approvedCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-gray-500 uppercase">
                  Rejected
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-bold text-red-700">{rejectedCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-gray-500 uppercase">
                  Total Approved Amount
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(totalApproved)}</p>
                <p className="text-xs text-gray-500 mt-1">Deductible from daily releases</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Advance List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Advance List</CardTitle>
              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <select
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">All Statuses</option>
                  <option value="PENDING">Pending</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(advanceData || []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                        {statusFilter
                          ? `No ${statusFilter.toLowerCase()} advance salary records found.`
                          : 'No advance salary records found.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    (advanceData || []).map((row: any) => (
                      <TableRow key={row.id} className={row.status === 'PENDING' ? 'bg-yellow-50/50' : ''}>
                        <TableCell className="font-medium">{row.employeeName}</TableCell>
                        <TableCell>{new Date(row.advanceDate).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(row.amount)}</TableCell>
                        <TableCell className="text-center">{renderStatusBadge(row.status)}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{row.notes || '—'}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            {/* Show approve button if not already approved */}
                            {row.status !== 'APPROVED' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-green-500 text-green-600 hover:bg-green-50"
                                disabled={updatingId === row.id}
                                onClick={() => handleStatusUpdate(row.id, 'APPROVED')}
                                title="Approve — will be deducted from daily releases"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            )}
                            {/* Show reject button if not already rejected */}
                            {row.status !== 'REJECTED' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-red-500 text-red-600 hover:bg-red-50"
                                disabled={updatingId === row.id}
                                onClick={() => handleStatusUpdate(row.id, 'REJECTED')}
                                title="Reject — will not be deducted from daily releases"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            )}
                            {row.status === 'APPROVED' && (
                              <span className="text-xs text-gray-400 ml-1">Deductible</span>
                            )}
                          </div>
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
