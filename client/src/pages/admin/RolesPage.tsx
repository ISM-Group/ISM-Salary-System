import { FormEvent, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { departmentsAPI, getApiErrorMessage, rolesAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';
import { isNonNegativeNumber } from '@/lib/formValidation';
import { useToast } from '@/hooks/use-toast';

export function RolesPage() {
  const [name, setName] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [dailyWage, setDailyWage] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

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

  const startEdit = (role: any) => {
    setEditingId(role.id);
    setName(role.name);
    setDepartmentId(role.departmentId || role.department?.id || '');
    setDailyWage(role.dailyWage != null ? String(role.dailyWage) : '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setName('');
    setDepartmentId('');
    setDailyWage('');
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Role name is required.');
      return;
    }
    if (!departmentId) {
      setError('Select a department.');
      return;
    }
    if (!isNonNegativeNumber(dailyWage)) {
      setError('Daily wage must be zero or more.');
      return;
    }

    const payload = {
      name: name.trim(),
      departmentId,
      dailyWage: dailyWage ? Number(dailyWage) : null,
    };

    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        await rolesAPI.update(editingId, payload);
        setEditingId(null);
        toast({ title: 'Role updated' });
      } else {
        await rolesAPI.create(payload);
        toast({ title: 'Role created' });
      }
      setName('');
      setDepartmentId('');
      setDailyWage('');
      await refetch();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to save role.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <MainLayout title="Roles" description="Manage roles and daily wage rates">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? 'Edit Role' : 'Create Role'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 md:grid-cols-4" onSubmit={submit}>
              {error && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 md:col-span-4">{error}</p>}
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
              <div className="flex gap-2">
                <Button type="submit" disabled={saving}>{saving ? 'Saving...' : editingId ? 'Save Changes' : 'Add Role'}</Button>
                {editingId && (
                  <Button type="button" variant="outline" onClick={cancelEdit}>
                    Cancel
                  </Button>
                )}
              </div>
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
                  <TableHead className="w-40">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(rolesData || []).map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.name}</TableCell>
                    <TableCell>{r.department?.name || '-'}</TableCell>
                    <TableCell>{r.dailyWage ? formatCurrency(r.dailyWage) : '-'}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startEdit(r)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            if (!window.confirm(`Delete ${r.name}?`)) {
                              return;
                            }
                            try {
                              await rolesAPI.delete(r.id);
                              if (editingId === r.id) cancelEdit();
                              await refetch();
                              toast({ title: 'Role deleted' });
                            } catch (err) {
                              setError(getApiErrorMessage(err, 'Failed to delete role.'));
                            }
                          }}
                        >
                          Delete
                        </Button>
                      </div>
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
