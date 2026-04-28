import { FormEvent, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { departmentsAPI, getApiErrorMessage, rolesAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageSkeleton, TableLoadingRows } from '@/components/ui/loading-spinner';
import { formatCurrency } from '@/lib/utils';
import { isNonNegativeNumber } from '@/lib/formValidation';
import { useToast } from '@/hooks/use-toast';

type SalaryType = 'FIXED' | 'DAILY_WAGE' | 'ANY';

const SALARY_TYPE_LABELS: Record<SalaryType, string> = {
  FIXED: 'Office (Fixed)',
  DAILY_WAGE: 'Site (Daily Wage)',
  ANY: 'Any',
};

const SALARY_TYPE_BADGE: Record<SalaryType, string> = {
  FIXED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  DAILY_WAGE: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  ANY: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

export function RolesPage() {
  const [name, setName] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [salaryType, setSalaryType] = useState<SalaryType>('ANY');
  const [dailyWage, setDailyWage] = useState('');
  const [monthlyWage, setMonthlyWage] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const { data: departmentsData, isLoading: isDepartmentsLoading } = useQuery({
    queryKey: ['departments-for-roles'],
    queryFn: async () => (await departmentsAPI.getAll()).data,
  });
  const { data: rolesData, isLoading: isRolesLoading, refetch } = useQuery({
    queryKey: ['roles-admin'],
    queryFn: async () => (await rolesAPI.getAll()).data,
  });

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setDepartmentId('');
    setSalaryType('ANY');
    setDailyWage('');
    setMonthlyWage('');
    setError(null);
  };

  const startEdit = (role: any) => {
    setEditingId(role.id);
    setName(role.name);
    setDepartmentId(role.departmentId || role.department?.id || '');
    setSalaryType((role.salaryType as SalaryType) || 'ANY');
    setDailyWage(role.dailyWage != null ? String(role.dailyWage) : '');
    setMonthlyWage(role.monthlyWage != null ? String(role.monthlyWage) : '');
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Role name is required.'); return; }
    if (!departmentId) { setError('Select a department.'); return; }
    if (salaryType === 'DAILY_WAGE' && !isNonNegativeNumber(dailyWage)) {
      setError('Daily wage must be zero or more.');
      return;
    }
    if (salaryType === 'FIXED' && !isNonNegativeNumber(monthlyWage)) {
      setError('Monthly wage must be zero or more.');
      return;
    }

    const payload = {
      name: name.trim(),
      departmentId,
      salaryType,
      dailyWage: salaryType === 'FIXED' ? null : (dailyWage ? Number(dailyWage) : null),
      monthlyWage: salaryType === 'DAILY_WAGE' ? null : (monthlyWage ? Number(monthlyWage) : null),
    };

    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        await rolesAPI.update(editingId, payload);
        toast({ title: 'Role updated' });
      } else {
        await rolesAPI.create(payload);
        toast({ title: 'Role created' });
      }
      resetForm();
      await refetch();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to save role.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <MainLayout title="Roles" description="Manage roles and wage rates">
      {isDepartmentsLoading && isRolesLoading ? (
        <PageSkeleton variant="form-table" />
      ) : (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? 'Edit Role' : 'Create Role'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 md:grid-cols-2 lg:grid-cols-4" onSubmit={submit}>
              {error && (
                <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 md:col-span-2 lg:col-span-4">
                  {error}
                </p>
              )}

              <Input placeholder="Role name" value={name} onChange={(e) => setName(e.target.value)} required />

              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                required
              >
                <option value="">Select department</option>
                {(departmentsData || []).map((d: any) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>

              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={salaryType}
                onChange={(e) => { setSalaryType(e.target.value as SalaryType); setDailyWage(''); setMonthlyWage(''); }}
              >
                <option value="ANY">Any (universal role)</option>
                <option value="FIXED">Office — Fixed salary</option>
                <option value="DAILY_WAGE">Site — Daily wage</option>
              </select>

              {/* Wage field — branches by salary type */}
              {salaryType === 'FIXED' ? (
                <Input
                  type="number"
                  placeholder="Default monthly wage (LKR)"
                  value={monthlyWage}
                  min={0}
                  step="0.01"
                  onChange={(e) => setMonthlyWage(e.target.value)}
                />
              ) : salaryType === 'DAILY_WAGE' ? (
                <Input
                  type="number"
                  placeholder="Daily wage rate (LKR)"
                  value={dailyWage}
                  min={0}
                  step="0.01"
                  onChange={(e) => setDailyWage(e.target.value)}
                />
              ) : (
                <div className="flex h-10 items-center rounded-md border border-dashed border-input px-3 text-sm text-muted-foreground">
                  No default wage for universal roles
                </div>
              )}

              <div className="flex gap-2 lg:col-span-4">
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Add Role'}
                </Button>
                {editingId && (
                  <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
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
                  <TableHead>Type</TableHead>
                  <TableHead>Default Wage</TableHead>
                  <TableHead className="w-40">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isRolesLoading ? (
                  <TableLoadingRows rows={6} columns={5} />
                ) : (rolesData || []).map((r: any) => {
                  const st: SalaryType = r.salaryType || 'ANY';
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell>{r.department?.name || '-'}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${SALARY_TYPE_BADGE[st]}`}>
                          {SALARY_TYPE_LABELS[st]}
                        </span>
                      </TableCell>
                      <TableCell>
                        {st === 'FIXED' ? (
                          r.monthlyWage ? (
                            <span>{formatCurrency(r.monthlyWage)}<span className="ml-1 text-xs text-muted-foreground">/mo</span></span>
                          ) : '-'
                        ) : r.dailyWage ? (
                          <span>{formatCurrency(r.dailyWage)}<span className="ml-1 text-xs text-muted-foreground">/day</span></span>
                        ) : r.monthlyWage ? (
                          <span>{formatCurrency(r.monthlyWage)}<span className="ml-1 text-xs text-muted-foreground">/mo</span></span>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => startEdit(r)}>Edit</Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              if (!window.confirm(`Delete ${r.name}?`)) return;
                              try {
                                await rolesAPI.delete(r.id);
                                if (editingId === r.id) resetForm();
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
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      )}
    </MainLayout>
  );
}
