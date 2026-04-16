import { FormEvent, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { employeesAPI, loansAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';

export function LoansPage() {
  const [employeeId, setEmployeeId] = useState('');
  const [loanAmount, setLoanAmount] = useState('');

  const { data: employeesData } = useQuery({
    queryKey: ['employees-for-loans'],
    queryFn: async () => {
      const response = await employeesAPI.getAll({ isActive: true });
      return response.data;
    },
  });
  const { data: loansData, refetch } = useQuery({
    queryKey: ['loans-admin'],
    queryFn: async () => {
      const response = await loansAPI.getAll();
      return response.data;
    },
  });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    await loansAPI.create({ employeeId, loanAmount: Number(loanAmount) });
    setEmployeeId('');
    setLoanAmount('');
    await refetch();
  };

  return (
    <MainLayout title="Loans" description="Manage employee loans">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Create Loan</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 md:grid-cols-3" onSubmit={submit}>
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
              <Input
                type="number"
                min="0"
                step="0.01"
                value={loanAmount}
                onChange={(e) => setLoanAmount(e.target.value)}
                placeholder="Loan amount"
                required
              />
              <Button type="submit">Create Loan</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Loan List</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Remaining</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-36">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(loansData || []).map((loan: any) => (
                  <TableRow key={loan.id}>
                    <TableCell>{loan.employeeName}</TableCell>
                    <TableCell>{formatCurrency(loan.loanAmount)}</TableCell>
                    <TableCell>{formatCurrency(loan.remainingBalance)}</TableCell>
                    <TableCell>{loan.status}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          const newStatus = loan.status === 'ACTIVE' ? 'PAID' : 'ACTIVE';
                          await loansAPI.update(loan.id, { status: newStatus });
                          await refetch();
                        }}
                      >
                        Toggle Status
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
