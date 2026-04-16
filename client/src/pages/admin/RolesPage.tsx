import { FormEvent, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { departmentsAPI, rolesAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';

export function RolesPage() {
  const [name, setName] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [dailyWage, setDailyWage] = useState('');

  const { data: departmentsData } = useQuery({
    queryKey: ['departments-for-roles'],
    queryFn: async () => {
      const response = await departmentsAPI.getAll();
      return response.data;
    },
  });
  const { data: rolesData, refetch } = useQuery({
    queryKey: ['roles-admin'],
    queryFn: async () => {
      const response = await rolesAPI.getAll();
      return response.data;
    },
  });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    await rolesAPI.create({
      name,
      departmentId,
      dailyWage: dailyWage ? Number(dailyWage) : null,
    });
    setName('');
    setDepartmentId('');
    setDailyWage('');
    await refetch();
  };

  return (
    <MainLayout title="Roles" description="Manage roles and daily wage rates">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Create Role</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 md:grid-cols-4" onSubmit={submit}>
              <Input placeholder="Role name" value={name} onChange={(e) => setName(e.target.value)} required />
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                required
              >
                <option value="">Select department</option>
                {(departmentsData || []).map((d: any) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
              <Input
                type="number"
                placeholder="Daily wage"
                value={dailyWage}
                onChange={(e) => setDailyWage(e.target.value)}
              />
              <Button type="submit">Add Role</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Role List</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Daily Wage</TableHead>
                  <TableHead className="w-32">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(rolesData || []).map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.name}</TableCell>
                    <TableCell>{r.department?.name || '-'}</TableCell>
                    <TableCell>{r.dailyWage ? formatCurrency(r.dailyWage) : '-'}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          if (!window.confirm(`Delete ${r.name}?`)) {
                            return;
                          }
                          await rolesAPI.delete(r.id);
                          await refetch();
                        }}
                      >
                        Delete
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
