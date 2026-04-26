import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { dailyReleasesAPI, getApiErrorMessage } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Banknote, RefreshCw, CheckCircle, AlertCircle, Trash2, History, X } from 'lucide-react';
import { isIsoDate } from '@/lib/formValidation';
import { useToast } from '@/hooks/use-toast';

/** Shape of a single daily release record from the API */
interface DailyRelease {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  releaseDate: string;
  dailyWage: number;
  loanDeduction: number;
  advanceDeduction: number;
  netAmount: number;
  status: 'PENDING' | 'RELEASED';
  attendanceStatus: string;
  releasedBy: string | null;
  releasedByName: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Summary totals returned by the API */
interface ReleaseSummary {
  totalRecords: number;
  pendingCount: number;
  releasedCount: number;
  totalDailyWages: number;
  totalLoanDeductions: number;
  totalAdvanceDeductions: number;
  totalNetAmount: number;
}

/** Shape of an employee release history record */
interface EmployeeReleaseHistory {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  releaseDate: string;
  dailyWage: number;
  loanDeduction: number;
  advanceDeduction: number;
  netAmount: number;
  status: string;
  attendanceStatus: string;
  createdAt: string;
}

/**
 * Formats a number as LKR currency display.
 * @param amount - The numeric amount to format
 * @returns Formatted string e.g. "Rs. 2,000.00"
 */
// PUBLIC_INTERFACE
function formatCurrency(amount: number): string {
  return `Rs. ${amount.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * DailySalaryReleasesPage — Manages daily salary payouts for daily-wage employees.
 *
 * Features:
 * - Date picker defaulting to today
 * - "Generate Releases" button: creates release records for PRESENT daily-wage employees
 * - Table showing each employee's daily wage, deductions, net amount, and status
 * - Individual "Release" button per row (ADMIN only)
 * - "Release All" bulk button (ADMIN only)
 * - Delete button for PENDING releases (ADMIN only)
 * - Summary card showing totals
 * - Employee release history viewer (click employee name to see history)
 *
 * Business rules:
 * - Daily releases are only created for employees who were PRESENT on the selected date
 * - Daily loan deductions are skipped on ABSENT days (handled server-side)
 * - Only APPROVED advance deductions taken on that date are subtracted
 * - When released, loan remaining balances are automatically decremented
 * - PAID holiday pay is generated for eligible daily-wage employees without attendance
 */
// PUBLIC_INTERFACE
export function DailySalaryReleasesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const { toast } = useToast();

  // State
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [releases, setReleases] = useState<DailyRelease[]>([]);
  const [summary, setSummary] = useState<ReleaseSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [releasingId, setReleasingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [releasingAll, setReleasingAll] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Employee history state
  const [historyEmployeeId, setHistoryEmployeeId] = useState<string | null>(null);
  const [historyEmployeeName, setHistoryEmployeeName] = useState<string>('');
  const [historyRecords, setHistoryRecords] = useState<EmployeeReleaseHistory[]>([]);
  const [historySummary, setHistorySummary] = useState<{ totalEarned: number; totalDeductions: number; totalNet: number; recordCount: number } | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  /**
   * Fetches daily release records for the selected date.
   */
  const fetchReleases = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const result = await dailyReleasesAPI.getAll(selectedDate);
      setReleases(result.data || []);
      setSummary(result.summary || null);
    } catch (err) {
      setMessage({ type: 'error', text: getApiErrorMessage(err, 'Failed to fetch daily releases.') });
      setReleases([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  // Auto-fetch when date changes
  useEffect(() => {
    fetchReleases();
  }, [fetchReleases]);

  /**
   * Generates daily release records for the selected date.
   * Only creates records for PRESENT daily-wage employees who don't already have one.
   */
  const handleGenerate = async () => {
    if (!isIsoDate(selectedDate)) {
      setMessage({ type: 'error', text: 'Select a valid release date.' });
      return;
    }

    setGenerating(true);
    setMessage(null);
    try {
      const result = await dailyReleasesAPI.generate(selectedDate);
      setMessage({
        type: 'success',
        text: result.message || `Generated ${result.data?.generated || 0} release(s).`,
      });
      toast({ title: 'Daily releases generated' });
      // Refresh the list after generation
      await fetchReleases();
    } catch (err) {
      setMessage({ type: 'error', text: getApiErrorMessage(err, 'Failed to generate daily releases.') });
    } finally {
      setGenerating(false);
    }
  };

  /**
   * Marks a single release record as RELEASED.
   * This also decrements loan remaining balances server-side.
   */
  const handleRelease = async (id: string) => {
    setReleasingId(id);
    setMessage(null);
    try {
      await dailyReleasesAPI.release(id);
      setMessage({ type: 'success', text: 'Daily salary released successfully.' });
      toast({ title: 'Daily salary released' });
      await fetchReleases();
    } catch (err) {
      setMessage({ type: 'error', text: getApiErrorMessage(err, 'Failed to release daily salary.') });
    } finally {
      setReleasingId(null);
    }
  };

  /**
   * Deletes a PENDING release record. Only PENDING records can be deleted.
   */
  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this pending release?')) return;
    setDeletingId(id);
    setMessage(null);
    try {
      await dailyReleasesAPI.deleteRelease(id);
      setMessage({ type: 'success', text: 'Release record deleted successfully.' });
      toast({ title: 'Release deleted' });
      await fetchReleases();
    } catch (err) {
      setMessage({ type: 'error', text: getApiErrorMessage(err, 'Failed to delete release record.') });
    } finally {
      setDeletingId(null);
    }
  };

  /**
   * Bulk-releases all PENDING records for the selected date.
   */
  const handleReleaseAll = async () => {
    if (!isIsoDate(selectedDate)) {
      setMessage({ type: 'error', text: 'Select a valid release date.' });
      return;
    }

    setReleasingAll(true);
    setMessage(null);
    try {
      const result = await dailyReleasesAPI.releaseAll(selectedDate);
      setMessage({
        type: 'success',
        text: result.message || `Released ${result.data?.released || 0} record(s).`,
      });
      toast({ title: 'Daily salaries released' });
      await fetchReleases();
    } catch (err) {
      setMessage({ type: 'error', text: getApiErrorMessage(err, 'Failed to bulk-release daily salaries.') });
    } finally {
      setReleasingAll(false);
    }
  };

  /**
   * Opens the employee release history panel.
   * Fetches release history for the last 30 days by default.
   */
  const openEmployeeHistory = async (employeeId: string, employeeName: string) => {
    setHistoryEmployeeId(employeeId);
    setHistoryEmployeeName(employeeName);
    setHistoryLoading(true);
    setHistoryRecords([]);
    setHistorySummary(null);

    try {
      // Fetch last 30 days of release history for this employee
      const today = new Date();
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const from = thirtyDaysAgo.toISOString().slice(0, 10);
      const to = today.toISOString().slice(0, 10);

      const result = await dailyReleasesAPI.getByEmployee(employeeId, { from, to });
      setHistoryRecords(result.data || []);
      setHistorySummary(result.summary || null);
    } catch (err) {
      setMessage({ type: 'error', text: getApiErrorMessage(err, 'Failed to fetch employee release history.') });
    } finally {
      setHistoryLoading(false);
    }
  };

  /**
   * Closes the employee release history panel.
   */
  const closeEmployeeHistory = () => {
    setHistoryEmployeeId(null);
    setHistoryEmployeeName('');
    setHistoryRecords([]);
    setHistorySummary(null);
  };

  const hasPending = releases.some((r) => r.status === 'PENDING');

  return (
    <MainLayout title="Daily Salary Releases" description="Manage daily salary payouts for daily-wage employees">
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Daily Salary Releases</h1>
            <p className="mt-1 text-sm text-gray-500">
              Generate and release daily salary payouts. Only PRESENT daily-wage employees qualify.
              Loan deductions skip ABSENT days. Only APPROVED advances are deducted.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Banknote className="h-8 w-8 text-green-600" />
          </div>
        </div>

        {/* Controls Row */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              {/* Date Picker */}
              <div className="flex flex-col gap-1">
                <label htmlFor="release-date" className="text-sm font-medium text-gray-700">
                  Release Date
                </label>
                <Input
                  id="release-date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-48"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  onClick={handleGenerate}
                  disabled={generating || loading}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {generating ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    'Generate Releases'
                  )}
                </Button>

                {isAdmin && hasPending && (
                  <Button
                    onClick={handleReleaseAll}
                    disabled={releasingAll || loading}
                    variant="outline"
                    className="border-green-600 text-green-600 hover:bg-green-50"
                  >
                    {releasingAll ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Releasing All...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Release All
                      </>
                    )}
                  </Button>
                )}

                <Button
                  onClick={fetchReleases}
                  disabled={loading}
                  variant="outline"
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status Message */}
        {message && (
          <div
            className={`flex items-center gap-2 rounded-lg p-3 text-sm ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            {message.text}
          </div>
        )}

        {/* Summary Cards */}
        {summary && summary.totalRecords > 0 && (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-gray-500 uppercase">
                  Total Daily Wages
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-bold text-gray-900">
                  {formatCurrency(summary.totalDailyWages)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-gray-500 uppercase">
                  Total Deductions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-bold text-red-600">
                  {formatCurrency(summary.totalLoanDeductions + summary.totalAdvanceDeductions)}
                </p>
                <div className="mt-1 text-xs text-gray-500">
                  <span>Loans: {formatCurrency(summary.totalLoanDeductions)}</span>
                  <span className="ml-2">Advances: {formatCurrency(summary.totalAdvanceDeductions)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-gray-500 uppercase">
                  Total Net Payout
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-lg font-bold ${summary.totalNetAmount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(summary.totalNetAmount)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-gray-500 uppercase">
                  Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                    {summary.pendingCount} Pending
                  </Badge>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                    {summary.releasedCount} Released
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Releases Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Releases for {selectedDate}
              {releases.length > 0 && (
                <span className="ml-2 text-sm font-normal text-gray-500">
                  ({releases.length} record{releases.length !== 1 ? 's' : ''})
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-500">Loading...</span>
              </div>
            ) : releases.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <Banknote className="mb-2 h-10 w-10 text-gray-300" />
                <p className="text-sm">No daily releases found for this date.</p>
                <p className="text-xs text-gray-400 mt-1">
                  Click &quot;Generate Releases&quot; to create records for PRESENT daily-wage employees.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead className="text-center">Attendance</TableHead>
                      <TableHead className="text-right">Daily Wage</TableHead>
                      <TableHead className="text-right">Loan Deduction</TableHead>
                      <TableHead className="text-right">Advance Deduction</TableHead>
                      <TableHead className="text-right">Net Amount</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      {isAdmin && <TableHead className="text-center">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {releases.map((release) => (
                      <TableRow
                        key={release.id}
                        className={release.status === 'PENDING' ? 'bg-yellow-50/50' : ''}
                      >
                        <TableCell>
                          <div>
                            <button
                              className="font-medium text-gray-900 hover:text-blue-600 hover:underline text-left"
                              onClick={() => openEmployeeHistory(release.employeeId, release.employeeName)}
                              title="View release history"
                            >
                              {release.employeeName}
                            </button>
                            <p className="text-xs text-gray-500">{release.employeeCode}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="outline"
                            className="bg-blue-50 text-blue-700 border-blue-300"
                          >
                            Present
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(release.dailyWage)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-red-600">
                          {release.loanDeduction > 0
                            ? `-${formatCurrency(release.loanDeduction)}`
                            : formatCurrency(0)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-red-600">
                          {release.advanceDeduction > 0
                            ? `-${formatCurrency(release.advanceDeduction)}`
                            : formatCurrency(0)}
                        </TableCell>
                        <TableCell
                          className={`text-right font-mono font-semibold ${
                            release.netAmount < 0 ? 'text-red-600' : 'text-green-700'
                          }`}
                        >
                          {formatCurrency(release.netAmount)}
                        </TableCell>
                        <TableCell className="text-center">
                          {release.status === 'RELEASED' ? (
                            <Badge className="bg-green-100 text-green-800 border-green-300">
                              Released
                            </Badge>
                          ) : (
                            <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
                              Pending
                            </Badge>
                          )}
                        </TableCell>
                        {isAdmin && (
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              {release.status === 'PENDING' ? (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() => handleRelease(release.id)}
                                    disabled={releasingId === release.id || deletingId === release.id}
                                    className="bg-green-600 hover:bg-green-700 text-white text-xs"
                                  >
                                    {releasingId === release.id ? (
                                      <RefreshCw className="h-3 w-3 animate-spin" />
                                    ) : (
                                      'Release'
                                    )}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleDelete(release.id)}
                                    disabled={releasingId === release.id || deletingId === release.id}
                                    className="border-red-400 text-red-600 hover:bg-red-50 text-xs"
                                    title="Delete this pending release"
                                  >
                                    {deletingId === release.id ? (
                                      <RefreshCw className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-3 w-3" />
                                    )}
                                  </Button>
                                </>
                              ) : (
                                <span className="text-xs text-gray-400">
                                  {release.releasedByName || '—'}
                                </span>
                              )}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Employee Release History Panel */}
        {historyEmployeeId && (
          <Card className="border-blue-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <History className="h-5 w-5 text-blue-600" />
                  Release History: {historyEmployeeName}
                  <span className="text-sm font-normal text-gray-500">(Last 30 days)</span>
                </CardTitle>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={closeEmployeeHistory}
                  title="Close history"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-5 w-5 animate-spin text-gray-400" />
                  <span className="ml-2 text-gray-500">Loading history...</span>
                </div>
              ) : historyRecords.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-6">
                  No release records found for this employee in the last 30 days.
                </p>
              ) : (
                <>
                  {/* History Summary */}
                  {historySummary && (
                    <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                      <div className="rounded-lg bg-gray-50 p-3 text-center">
                        <p className="text-xs text-gray-500">Records</p>
                        <p className="text-lg font-bold text-gray-900">{historySummary.recordCount}</p>
                      </div>
                      <div className="rounded-lg bg-green-50 p-3 text-center">
                        <p className="text-xs text-gray-500">Total Earned</p>
                        <p className="text-lg font-bold text-green-700">{formatCurrency(historySummary.totalEarned)}</p>
                      </div>
                      <div className="rounded-lg bg-red-50 p-3 text-center">
                        <p className="text-xs text-gray-500">Total Deductions</p>
                        <p className="text-lg font-bold text-red-600">{formatCurrency(historySummary.totalDeductions)}</p>
                      </div>
                      <div className="rounded-lg bg-blue-50 p-3 text-center">
                        <p className="text-xs text-gray-500">Total Net</p>
                        <p className={`text-lg font-bold ${historySummary.totalNet < 0 ? 'text-red-600' : 'text-blue-700'}`}>
                          {formatCurrency(historySummary.totalNet)}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* History Table */}
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">Daily Wage</TableHead>
                          <TableHead className="text-right">Loan Ded.</TableHead>
                          <TableHead className="text-right">Advance Ded.</TableHead>
                          <TableHead className="text-right">Net Amount</TableHead>
                          <TableHead className="text-center">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {historyRecords.map((rec) => (
                          <TableRow key={rec.id}>
                            <TableCell className="font-mono text-sm">
                              {new Date(rec.releaseDate).toLocaleDateString('en-LK', {
                                weekday: 'short',
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {formatCurrency(rec.dailyWage)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-red-600">
                              {rec.loanDeduction > 0 ? `-${formatCurrency(rec.loanDeduction)}` : formatCurrency(0)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-red-600">
                              {rec.advanceDeduction > 0 ? `-${formatCurrency(rec.advanceDeduction)}` : formatCurrency(0)}
                            </TableCell>
                            <TableCell
                              className={`text-right font-mono font-semibold ${
                                rec.netAmount < 0 ? 'text-red-600' : 'text-green-700'
                              }`}
                            >
                              {formatCurrency(rec.netAmount)}
                            </TableCell>
                            <TableCell className="text-center">
                              {rec.status === 'RELEASED' ? (
                                <Badge className="bg-green-100 text-green-800 border-green-300 text-xs">
                                  Released
                                </Badge>
                              ) : (
                                <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 text-xs">
                                  Pending
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
