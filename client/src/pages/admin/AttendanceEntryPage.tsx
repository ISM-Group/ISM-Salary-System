import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { attendanceAPI, employeesAPI, departmentsAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export function AttendanceEntryPage() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [employeeId, setEmployeeId] = useState('');
  const [status, setStatus] = useState('PRESENT');
  const [notes, setNotes] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [search, setSearch] = useState('');
  const [onLeaveMap, setOnLeaveMap] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  const { data: employeesData } = useQuery({
    queryKey: ['employees-for-attendance'],
    queryFn: async () => {
      const response = await employeesAPI.getAll({ isActive: true });
      return response.data;
    },
  });

  const { data: departmentsData } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const response = await departmentsAPI.getAll();
      return response.data;
    },
  });

  const { data: deptEmployeesData } = useQuery({
    queryKey: ['employees-by-department', departmentId],
    enabled: !!departmentId,
    queryFn: async () => {
      const response = await employeesAPI.getAll({ departmentId, isActive: true });
      return response.data;
    },
  });

  const { data: dailyData, refetch } = useQuery({
    queryKey: ['attendance-daily', date],
    queryFn: async () => {
      const response = await attendanceAPI.getDaily(date);
      return response.data;
    },
  });

  const employees = useMemo(() => {
    if (departmentId) return deptEmployeesData || [];
    return employeesData || [];
  }, [employeesData, deptEmployeesData, departmentId]);
  const records = useMemo(() => dailyData || [], [dailyData]);

  const recordsByEmployee = useMemo(() => {
    const m: Record<string, any> = {};
    (records || []).forEach((r: any) => {
      if (r.employeeId) m[r.employeeId] = r;
    });
    return m;
  }, [records]);

  // initialize onLeave map when employees or records change
  useEffect(() => {
    const m: Record<string, boolean> = {};
    (employees || []).forEach((emp: any) => {
      const rec = recordsByEmployee[emp.id];
      m[emp.id] = rec ? rec.status !== 'PRESENT' : false;
    });
    setOnLeaveMap(m);
  }, [employees, recordsByEmployee]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    await attendanceAPI.create({ employeeId, date, status, notes });
    setNotes('');
    await refetch();
  };

  const toggleLeave = (id: string) => {
    setOnLeaveMap((p) => ({ ...p, [id]: !p[id] }));
  };

  const filteredEmployees = useMemo(() => {
    if (!search) return employees || [];
    const s = search.toLowerCase();
    return (employees || []).filter((emp: any) => (emp.fullName || '').toLowerCase().includes(s) || (emp.employeeId || '').toLowerCase().includes(s));
  }, [employees, search]);

  const saveBulk = async () => {
    setSaving(true);
    try {
      const promises = (filteredEmployees || []).map((emp: any) => {
        const wantLeave = !!onLeaveMap[emp.id];
        const desiredStatus = wantLeave ? 'ABSENT' : 'PRESENT';
        const existing = recordsByEmployee[emp.id];
        if (existing && existing.status === desiredStatus) return Promise.resolve(null);
        return attendanceAPI.create({ employeeId: emp.id, date, status: desiredStatus, notes: '' });
      });
      await Promise.all(promises);
      await refetch();
      alert('Saved attendance for selected department');
    } catch (err) {
      console.error(err);
      alert('Error saving attendance');
    } finally {
      setSaving(false);
    }
  };

  return (
    <MainLayout title="Attendance Entry" description="Record or update daily attendance">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Add Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 md:grid-cols-5" onSubmit={submit}>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />

              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
              >
                <option value="">-- Select department (bulk) --</option>
                {(departmentsData || []).map((d: any) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>

              {/* when no department selected keep single-employee entry */}
              {!departmentId ? (
                <>
                  <select
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    required
                  >
                    <option value="">Select employee</option>
                    {employees.map((e: any) => (
                      <option key={e.id} value={e.id}>
                        {e.fullName} ({e.employeeId})
                      </option>
                    ))}
                  </select>
                  <select
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="PRESENT">Present</option>
                    <option value="ABSENT">Absent</option>
                  </select>
                </>
              ) : (
                <div className="md:col-span-3" />
              )}

              <Input placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
              {!departmentId ? (
                <Button type="submit">Save</Button>
              ) : (
                <Button type="button" onClick={saveBulk} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Department'}
                </Button>
              )}
            </form>
          </CardContent>
        </Card>

        {departmentId && (
          <Card>
            <CardHeader>
              <CardTitle>
                Department Employees {(departmentsData || []).find((d: any) => d.id === departmentId)?.name || ''}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex items-center gap-2">
                <Input placeholder="Search employee name or code" value={search} onChange={(e) => setSearch(e.target.value)} />
                <Button type="button" onClick={() => setSearch('')}>Clear</Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>On Leave</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map((emp: any) => (
                    <TableRow key={emp.id}>
                      <TableCell>{emp.fullName}</TableCell>
                      <TableCell>{emp.employeeId}</TableCell>
                      <TableCell>
                        <input type="checkbox" checked={!!onLeaveMap[emp.id]} onChange={() => toggleLeave(emp.id)} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Records for {date}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((row: any) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.employeeName}</TableCell>
                    <TableCell>{row.employeeCode}</TableCell>
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
