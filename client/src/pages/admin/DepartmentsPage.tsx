import { FormEvent, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { departmentsAPI, getApiErrorMessage } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';

export function DepartmentsPage() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const { data, refetch } = useQuery({
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

  return (
    <MainLayout title="Departments" description="Manage departments">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? 'Edit Department' : 'Create Department'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 md:grid-cols-3" onSubmit={submit}>
              {error && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 md:col-span-3">{error}</p>}
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Department name" required />
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description"
              />
              <div className="flex gap-2">
                <Button type="submit" disabled={saving}>{saving ? 'Saving...' : editingId ? 'Save Changes' : 'Add Department'}</Button>
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
            <CardTitle>Department List</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-40">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data || []).map((row: any) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.description || '-'}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startEdit(row)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            if (!window.confirm(`Delete ${row.name}?`)) {
                              return;
                            }
                            try {
                              await departmentsAPI.delete(row.id);
                              if (editingId === row.id) cancelEdit();
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
