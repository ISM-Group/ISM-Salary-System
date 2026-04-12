import { FormEvent, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { attendanceAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export function EmployeeAttendanceEntryPage() {
  const [employeeId, setEmployeeId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState('PRESENT');
  const [notes, setNotes] = useState('');

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
    await attendanceAPI.create({ employeeId, date, status, notes });
    setNotes('');
    await refetch();
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
                <option value="HALF_DAY">Half Day</option>
              </select>
              <Input placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
              <Button type="submit">Submit</Button>
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
