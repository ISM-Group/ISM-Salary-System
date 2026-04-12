import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { salaryAPI } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';

export function SalaryHistoryPage() {
  const [employeeId, setEmployeeId] = useState('');

  const { data } = useQuery({
    queryKey: ['salary-history-admin', employeeId],
    queryFn: async () => {
      const response = await salaryAPI.getHistory(employeeId ? { employeeId } : undefined);
      return response.data;
    },
  });

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
            onChange={(e) => setEmployeeId(e.target.value)}
          />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Month</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data || []).map((row: any) => (
                <TableRow key={row.id}>
                  <TableCell>{row.employeeId}</TableCell>
                  <TableCell>{new Date(row.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</TableCell>
                  <TableCell>{formatCurrency(row.totalSalary)}</TableCell>
                  <TableCell>{row.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </MainLayout>
  );
}
