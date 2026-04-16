import { FormEvent, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { advanceSalariesAPI, employeesAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';

export function AdvanceSalariesPage() {
  const [employeeId, setEmployeeId] = useState('');
  const [amount, setAmount] = useState('');
  const [advanceDate, setAdvanceDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');

  const { data: employeesData } = useQuery({
    queryKey: ['employees-for-advance'],
    queryFn: async () => {
      const response = await employeesAPI.getAll({ isActive: true });
      return response.data;
    },
  });
  const { data: advanceData, refetch } = useQuery({
    queryKey: ['advance-salaries-admin'],
    queryFn: async () => {
      const response = await advanceSalariesAPI.getAll();
      return response.data;
    },
  });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('employeeId', employeeId);
    formData.append('amount', amount);
    formData.append('advanceDate', advanceDate);
    formData.append('notes', notes);
    await advanceSalariesAPI.create(formData);
    setEmployeeId('');
    setAmount('');
    setNotes('');
    await refetch();
  };

  return (
    <MainLayout title="Advance Salaries" description="Track salary advances">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Create Advance Salary</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 md:grid-cols-5" onSubmit={submit}>
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
              <Input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
              <Input type="date" value={advanceDate} onChange={(e) => setAdvanceDate(e.target.value)} required />
              <Input placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
              <Button type="submit">Create</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Advance List</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(advanceData || []).map((row: any) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.employeeName}</TableCell>
                    <TableCell>{new Date(row.advanceDate).toLocaleDateString()}</TableCell>
                    <TableCell>{formatCurrency(row.amount)}</TableCell>
                    <TableCell>{row.notes || '-'}</TableCell>
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
