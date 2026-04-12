import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { attendanceAPI } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export function EmployeeAttendanceCalendarPage() {
  const { id } = useParams<{ id: string }>();
  const [from, setFrom] = useState(new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().slice(0, 10));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));

  const { data } = useQuery({
    queryKey: ['employee-attendance-calendar', id, from, to],
    enabled: !!id,
    queryFn: async () => {
      const response = await attendanceAPI.getEmployeeAttendanceCalendar(id!, { from, to });
      return response.data;
    },
  });

  const rows = useMemo(() => data || [], [data]);

  return (
    <MainLayout title="Attendance Calendar" description="Detailed attendance records">
      <Card>
        <CardHeader>
          <CardTitle>Employee Attendance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row: any) => (
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
    </MainLayout>
  );
}
