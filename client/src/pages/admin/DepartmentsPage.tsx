import { FormEvent, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { departmentsAPI, departmentRulesAPI, getApiErrorMessage } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageSkeleton, TableLoadingRows } from '@/components/ui/loading-spinner';
import { useToast } from '@/hooks/use-toast';

type DeptRules = { paidLeaveDays: number; fullAttendanceBonusDays: number };

export function DepartmentsPage() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const [rulesOpenDeptId, setRulesOpenDeptId] = useState<string | null>(null);
  const [rulesPaidLeave, setRulesPaidLeave] = useState('0');
  const [rulesBonus, setRulesBonus] = useState('0');
  const [rulesSaving, setRulesSaving] = useState(false);
  const [rulesCache, setRulesCache] = useState<Record<string, DeptRules>>({});

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['departments-admin'],
    queryFn: async () => {
      const response = await departmentsAPI.getAll();
      return response.data;
    },
  });

  const startEdit = (dept: any) => {
    setEditingId(dept.id);
    setName(dept.name);
    setDescription(dept.description || '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setName('');
    setDescription('');
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Department name is required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        await departmentsAPI.update(editingId, { name: name.trim(), description: description.trim() || null });
        setEditingId(null);
        toast({ title: 'Department updated' });
      } else {
        await departmentsAPI.create({ name: name.trim(), description: description.trim() || null });
        toast({ title: 'Department created' });
      }
      setName('');
      setDescription('');
      await refetch();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to save department.'));
    } finally {
      setSaving(false);
    }
  };

  const openRules = async (deptId: string) => {
    if (rulesOpenDeptId === deptId) { setRulesOpenDeptId(null); return; }
    const existing = rulesCache[deptId] ?? await departmentRulesAPI.getByDepartment(deptId);
    setRulesCache((c) => ({ ...c, [deptId]: existing }));
    setRulesPaidLeave(String(existing.paidLeaveDays));
    setRulesBonus(String(existing.fullAttendanceBonusDays));
    setRulesOpenDeptId(deptId);
  };

  const saveRules = async (deptId: string) => {
    setRulesSaving(true);
    try {
      const payload = { paidLeaveDays: Number(rulesPaidLeave) || 0, fullAttendanceBonusDays: Number(rulesBonus) || 0 };
      await departmentRulesAPI.upsert(deptId, payload);
      setRulesCache((c) => ({ ...c, [deptId]: payload }));
      toast({ title: 'Rules saved' });
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to save rules.'));
    } finally {
      setRulesSaving(false);
    }
  };

  const clearRules = async (deptId: string) => {
    setRulesSaving(true);
    try {
      await departmentRulesAPI.remove(deptId);
      const cleared = { paidLeaveDays: 0, fullAttendanceBonusDays: 0 };
      setRulesCache((c) => ({ ...c, [deptId]: cleared }));
      setRulesPaidLeave('0');
      setRulesBonus('0');
      toast({ title: 'Rules cleared' });
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to clear rules.'));
    } finally {
      setRulesSaving(false);
    }
  };

  const hasRules = (deptId: string) => {
    const r = rulesCache[deptId];
    return r && (r.paidLeaveDays > 0 || r.fullAttendanceBonusDays > 0);
  };

  return (
    <MainLayout title="Departments" description="Manage departments">
      {isLoading ? (
        <PageSkeleton variant="form-table" />
      ) : (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? 'Edit Department' : 'Create Department'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 md:grid-cols-3" onSubmit={submit}>
              {error && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 md:col-span-3">{error}</p>}
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Department name" required />
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" />
              <div className="flex gap-2">
                <Button type="submit" disabled={saving}>{saving ? 'Saving...' : editingId ? 'Save Changes' : 'Add Department'}</Button>
                {editingId && <Button type="button" variant="outline" onClick={cancelEdit}>Cancel</Button>}
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Department List</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-56">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableLoadingRows rows={5} columns={3} />
                ) : (data || []).flatMap((row: any) => [
                  <TableRow key={row.id}>
                    <TableCell>
                      <span>{row.name}</span>
                      {hasRules(row.id) && (
                        <Badge variant="outline" className="ml-2 text-xs border-amber-400 text-amber-700">Rules</Badge>
                      )}
                    </TableCell>
                    <TableCell>{row.description || '-'}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => startEdit(row)}>Edit</Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className={rulesOpenDeptId === row.id ? 'border-amber-400 text-amber-700' : ''}
                          onClick={() => openRules(row.id)}
                        >
                          Rules
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            if (!window.confirm(`Delete ${row.name}?`)) return;
                            try {
                              await departmentsAPI.delete(row.id);
                              if (editingId === row.id) cancelEdit();
                              if (rulesOpenDeptId === row.id) setRulesOpenDeptId(null);
                              await refetch();
                              toast({ title: 'Department deleted' });
                            } catch (err) {
                              setError(getApiErrorMessage(err, 'Failed to delete department.'));
                            }
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>,
                  rulesOpenDeptId === row.id && (
                    <TableRow key={`${row.id}-rules`}>
                      <TableCell colSpan={3} className="bg-muted/40 py-4 px-4">
                        <div className="flex flex-wrap items-end gap-6">
                          <div>
                            <label className="text-xs font-medium block mb-1">Paid Leave Days</label>
                            <Input
                              type="number" min="0" max="31" className="w-24"
                              value={rulesPaidLeave}
                              onChange={(e) => setRulesPaidLeave(e.target.value)}
                            />
                            <p className="mt-1 text-xs text-muted-foreground">First N absences are paid</p>
                          </div>
                          <div>
                            <label className="text-xs font-medium block mb-1">Full Attendance Bonus Days</label>
                            <Input
                              type="number" min="0" max="31" className="w-24"
                              value={rulesBonus}
                              onChange={(e) => setRulesBonus(e.target.value)}
                            />
                            <p className="mt-1 text-xs text-muted-foreground">Extra days pay if zero absences</p>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" disabled={rulesSaving} onClick={() => saveRules(row.id)}>
                              {rulesSaving ? 'Saving...' : 'Save Rules'}
                            </Button>
                            <Button size="sm" variant="ghost" disabled={rulesSaving} onClick={() => clearRules(row.id)}>
                              Clear Rules
                            </Button>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ),
                ])}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      )}
    </MainLayout>
  );
}
