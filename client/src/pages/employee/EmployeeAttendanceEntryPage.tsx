import { FormEvent, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { attendanceAPI, getApiErrorMessage } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { isIsoDate } from '@/lib/formValidation';
import { useToast } from '@/hooks/use-toast';

export function EmployeeAttendanceEntryPage() {
  const [employeeId, setEmployeeId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState('PRESENT');
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const { data, refetch } = useQuery({
    queryKey: ['employee-attendance-list', employeeId],
    queryFn: async () => {
      if (!employeeId) {
        return [];
      }
      const response = await attendanceAPI.getAll({ employeeId });
      return response.data;
    },
  });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!employeeId.trim()) {
      setMessage('Employee ID is required.');
      return;
    }
    if (!isIsoDate(date)) {
      setMessage('Select a valid date.');
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      await attendanceAPI.create({ employeeId: employeeId.trim(), date, status, notes: notes.trim() || null });
      setNotes('');
      await refetch();
      toast({ title: 'Attendance submitted' });
    } catch (err) {
      setMessage(getApiErrorMessage(err, 'Failed to submit attendance.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <MainLayout title="Attendance" description="Submit or review attendance records">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Submit Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 md:grid-cols-4" onSubmit={submit}>
              {message && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 md:col-span-4">{message}</p>}
              <Input
                placeholder="Employee ID"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                required
              />
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="PRESENT">Present</option>
                <option value="ABSENT">Absent</option>
              </select>
              <Input placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
              <Button type="submit" disabled={saving}>{saving ? 'Submitting...' : 'Submit'}</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Attendance History</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data || []).map((row: any) => (
                  <TableRow key={row.id}>
                    <TableCell>{new Date(row.date).toLocaleDateString()}</TableCell>
                    <TableCell>{row.status}</TableCell>
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
