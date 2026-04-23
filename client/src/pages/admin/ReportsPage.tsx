import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Download, FileText, Printer } from 'lucide-react';
import { exportsAPI } from '@/lib/api';

// PUBLIC_INTERFACE
/**
 * ReportsPage — Allows admins/managers to download CSV and PDF reports
 * for payroll, attendance, and loan data, with optional date/employee filters.
 */
export function ReportsPage() {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const token = localStorage.getItem('token');

  /**
   * Opens a URL in a new window with the auth token appended.
   * For CSV downloads, triggers a direct download.
   * For HTML reports, opens a printable view.
   */
  const openExport = (url: string) => {
    // Append auth token for authenticated access
    const separator = url.includes('?') ? '&' : '?';
    const authUrl = `${url}${separator}token=${encodeURIComponent(token || '')}`;
    window.open(authUrl, '_blank');
  };

  const buildParams = (format: string): Record<string, string> => {
    const params: Record<string, string> = { format };
    if (fromDate) params.from = fromDate;
    if (toDate) params.to = toDate;
    return params;
  };

  return (
    <MainLayout title="Reports & Exports" description="Download reports in CSV or PDF format">
      <div className="space-y-6">
        {/* Date range filter */}
        <Card>
          <CardHeader>
            <CardTitle>Filter Options</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-sm font-medium text-gray-700">From Date</label>
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-sm font-medium text-gray-700">To Date</label>
                <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payroll Reports */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-accent" />
              Payroll Report
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Export salary calculation records including gross earnings, deductions, and net salary for all employees.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => openExport(exportsAPI.getPayrollExport(buildParams('csv')))}
              >
                <Download className="h-4 w-4 mr-2" />
                Download CSV
              </Button>
              <Button
                variant="outline"
                onClick={() => openExport(exportsAPI.getPayrollExport(buildParams('html')))}
              >
                <Printer className="h-4 w-4 mr-2" />
                Print / PDF
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Attendance Reports */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-accent" />
              Attendance Report
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Export attendance records showing present/absent status for all employees across the selected date range.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => openExport(exportsAPI.getAttendanceExport(buildParams('csv')))}
              >
                <Download className="h-4 w-4 mr-2" />
                Download CSV
              </Button>
              <Button
                variant="outline"
                onClick={() => openExport(exportsAPI.getAttendanceExport(buildParams('html')))}
              >
                <Printer className="h-4 w-4 mr-2" />
                Print / PDF
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Loan Reports */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-accent" />
              Loan Report
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Export all loan records including amounts, remaining balances, repayment modes, and statuses.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => openExport(exportsAPI.getLoansExport(buildParams('csv')))}
              >
                <Download className="h-4 w-4 mr-2" />
                Download CSV
              </Button>
              <Button
                variant="outline"
                onClick={() => openExport(exportsAPI.getLoansExport(buildParams('html')))}
              >
                <Printer className="h-4 w-4 mr-2" />
                Print / PDF
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
