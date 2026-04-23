import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { salaryAPI, exportsAPI } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import { formatCurrency } from '@/lib/utils';
import { Printer } from 'lucide-react';

// PUBLIC_INTERFACE
/**
 * SalaryHistoryPage — Displays salary calculation history with
 * server-side pagination, employee filtering, and payslip generation.
 */
export function SalaryHistoryPage() {
  const [employeeId, setEmployeeId] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data: responseData } = useQuery({
    queryKey: ['salary-history-admin', employeeId, page, limit],
    queryFn: async () => {
      const params: Record<string, unknown> = { page, limit };
      if (employeeId) params.employeeId = employeeId;
      const response = await salaryAPI.getHistory(params);
      return response;
    },
  });

  const salaryRecords = responseData?.data || [];
  const pagination = responseData?.pagination;

  const openPayslip = (empId: string, month: string) => {
    // Format month to YYYY-MM
    const monthStr = month.substring(0, 7);
    const url = exportsAPI.getPayslipUrl(empId, monthStr);
    const token = localStorage.getItem('token');
    window.open(`${url}&token=${encodeURIComponent(token || '')}`, '_blank');
  };

  return (
    <MainLayout title="Salary History" description="Review calculated salary records">
      <Card>
        <CardHeader>
          <CardTitle>Salary Records</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Filter by employee ID (optional)"
            value={employeeId}
            onChange={(e) => { setEmployeeId(e.target.value); setPage(1); }}
          />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Month</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-16">Payslip</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {salaryRecords.map((row: any) => (
                <TableRow key={row.id}>
                  <TableCell>{row.employeeId}</TableCell>
                  <TableCell>{new Date(row.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(row.totalSalary)}</TableCell>
                  <TableCell>{row.status}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openPayslip(row.employeeId, row.month)}
                      title="View payslip"
                    >
                      <Printer className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {salaryRecords.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No salary records found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {pagination && (
            <Pagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              total={pagination.total}
              limit={pagination.limit}
              onPageChange={setPage}
            />
          )}
        </CardContent>
      </Card>
    </MainLayout>
  );
}
