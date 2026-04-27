import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { attendanceAPI, employeesAPI, departmentsAPI, rolesAPI, getApiErrorMessage } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Search, CalendarDays, Users, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

type AttendanceStatus = 'PRESENT' | 'ABSENT';

function StatusDropdown({
  employeeId,
  employeeName,
  date,
  roleId,
  initialStatus,
  existingRecordId,
  onSaved,
}: {
  employeeId: string;
  employeeName: string;
  date: string;
  roleId: string | null;
  initialStatus: AttendanceStatus;
  existingRecordId?: string;
  onSaved: () => void;
}) {
  const [status, setStatus] = useState<AttendanceStatus>(initialStatus);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const isFirstRender = useRef(true);

  // Sync when date or external data changes
  useEffect(() => {
    setStatus(initialStatus);
    isFirstRender.current = true;
  }, [initialStatus, date]);

  const handleChange = async (newStatus: AttendanceStatus) => {
    if (newStatus === status && !isFirstRender.current) return;
    isFirstRender.current = false;
    setStatus(newStatus);
    setSaving(true);
    try {
      await attendanceAPI.create({
        employeeId,
        date,
        status: newStatus,
        notes: '',
        roleId,
      });
      onSaved();
      toast({
        title: `${employeeName} — ${newStatus === 'PRESENT' ? 'Present' : 'Absent'}`,
        description: 'Attendance updated',
      });
    } catch (err) {
      setStatus(status); // revert
      toast({
        title: getApiErrorMessage(err, 'Failed to update attendance'),
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <select
          value={status}
          onChange={(e) => handleChange(e.target.value as AttendanceStatus)}
          disabled={saving}
          className={cn(
            'h-8 rounded-lg border px-2 pr-6 text-xs font-medium transition-colors cursor-pointer appearance-none',
            status === 'PRESENT'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400'
              : 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-400',
            saving && 'opacity-60 cursor-not-allowed'
          )}
        >
          <option value="PRESENT">Present</option>
          <option value="ABSENT">Absent</option>
        </select>
        <div className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2">
          {saving ? (
            <Loader2 className="h-3 w-3 animate-spin text-current" />
          ) : (
            <svg className="h-3 w-3 text-current opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}

export function AttendanceEntryPage() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [departmentId, setDepartmentId] = useState('');
  const [search, setSearch] = useState('');
  const [bulkRole, setBulkRole] = useState('');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: employeesData } = useQuery({
    queryKey: ['employees-for-attendance'],
    queryFn: async () => (await employeesAPI.getAll({ isActive: true })).data,
  });

  const { data: departmentsData } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => (await departmentsAPI.getAll()).data,
  });

  const { data: deptEmployeesData } = useQuery({
    queryKey: ['employees-by-department', departmentId],
    enabled: !!departmentId,
    queryFn: async () => (await employeesAPI.getAll({ departmentId, isActive: true })).data,
  });

  const { data: rolesData } = useQuery({
    queryKey: ['roles-for-attendance', departmentId],
    enabled: !!departmentId,
    queryFn: async () => (await rolesAPI.getByDepartment(departmentId)).data,
  });

  const { data: dailyData, refetch } = useQuery({
    queryKey: ['attendance-daily', date],
    queryFn: async () => (await attendanceAPI.getDaily(date)).data,
  });

  const employees: any[] = useMemo(() => {
    if (departmentId) return deptEmployeesData || [];
    return employeesData || [];
  }, [employeesData, deptEmployeesData, departmentId]);

  const records: any[] = useMemo(() => dailyData || [], [dailyData]);

  const recordsByEmployee = useMemo(() => {
    const m: Record<string, any> = {};
    records.forEach((r: any) => { if (r.employeeId) m[r.employeeId] = r; });
    return m;
  }, [records]);

  const filteredEmployees = useMemo(() => {
    const list = employees || [];
    if (!search) return list;
    const s = search.toLowerCase();
    return list.filter((e: any) =>
      (e.fullName || '').toLowerCase().includes(s) || (e.employeeId || '').toLowerCase().includes(s)
    );
  }, [employees, search]);

  const presentCount = useMemo(
    () => filteredEmployees.filter((e: any) => {
      const rec = recordsByEmployee[e.id];
      return rec ? rec.status === 'PRESENT' : true;
    }).length,
    [filteredEmployees, recordsByEmployee]
  );
  const absentCount = filteredEmployees.length - presentCount;

  const markAllPresent = async () => {
    const toUpdate = filteredEmployees.filter((e: any) => {
      const rec = recordsByEmployee[e.id];
      return !rec || rec.status !== 'PRESENT';
    });
    if (!toUpdate.length) return;
    try {
      await Promise.all(toUpdate.map((e: any) =>
        attendanceAPI.create({ employeeId: e.id, date, status: 'PRESENT', notes: '', roleId: bulkRole || null })
      ));
      await refetch();
      toast({ title: `Marked ${toUpdate.length} employee(s) Present` });
    } catch (err) {
      toast({ title: getApiErrorMessage(err, 'Failed to mark all present'), variant: 'destructive' });
    }
  };

  return (
    <MainLayout title="Attendance Entry" description="Record daily attendance for employees">
      <div className="space-y-5">
        {/* Filters bar */}
        <div className="glass-panel p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Date</label>
              <div className="relative">
                <CalendarDays className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-9 pl-8 text-sm"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Department</label>
              <select
                className="h-9 rounded-lg border border-input bg-background px-3 text-sm dark:bg-slate-900"
                value={departmentId}
                onChange={(e) => { setDepartmentId(e.target.value); setBulkRole(''); }}
              >
                <option value="">All departments</option>
                {(departmentsData || []).map((d: any) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            {departmentId && (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Default Role</label>
                <select
                  className="h-9 rounded-lg border border-input bg-background px-3 text-sm dark:bg-slate-900"
                  value={bulkRole}
                  onChange={(e) => setBulkRole(e.target.value)}
                >
                  <option value="">Per employee default</option>
                  {(rolesData || []).map((r: any) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Search</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Name or employee code"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 pl-8 text-sm"
                />
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={markAllPresent}
              className="h-9 gap-1.5 text-emerald-700 border-emerald-200 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800 dark:hover:bg-emerald-950/40"
            >
              <CheckCircle2 className="h-4 w-4" />
              Mark All Present
            </Button>
          </div>
        </div>

        {/* Summary badges */}
        {filteredEmployees.length > 0 && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Users className="h-4 w-4 text-slate-400" />
              <span className="text-sm text-slate-600 dark:text-slate-400">{filteredEmployees.length} employees</span>
            </div>
            <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400">
              <CheckCircle2 className="mr-1 h-3 w-3" />
              {presentCount} Present
            </Badge>
            <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
              <XCircle className="mr-1 h-3 w-3" />
              {absentCount} Absent
            </Badge>
          </div>
        )}

        {/* Employee table */}
        <div className="glass-panel overflow-hidden">
          <div className="border-b border-white/30 dark:border-white/8 px-5 py-3.5">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Attendance — {date}
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/20 dark:border-white/8 bg-white/30 dark:bg-white/3">
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Employee</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Code</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Role</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/15 dark:divide-white/6">
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                      {search ? 'No employees match your search.' : 'Select a department or search to view employees.'}
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp: any) => {
                    const rec = recordsByEmployee[emp.id];
                    const currentStatus: AttendanceStatus = rec ? rec.status : 'PRESENT';
                    return (
                      <tr
                        key={emp.id}
                        className="transition-colors hover:bg-white/20 dark:hover:bg-white/4"
                      >
                        <td className="px-5 py-3 font-medium text-slate-900 dark:text-slate-100">
                          {emp.fullName}
                        </td>
                        <td className="px-5 py-3 font-mono text-xs text-slate-500 dark:text-slate-400">
                          {emp.employeeId}
                        </td>
                        <td className="px-5 py-3 text-slate-600 dark:text-slate-400">
                          {rec?.roleName || emp.roleName || <span className="text-slate-400 dark:text-slate-500 italic text-xs">default</span>}
                        </td>
                        <td className="px-5 py-3">
                          <StatusDropdown
                            employeeId={emp.id}
                            employeeName={emp.fullName}
                            date={date}
                            roleId={bulkRole || emp.roleId || null}
                            initialStatus={currentStatus}
                            existingRecordId={rec?.id}
                            onSaved={() => {
                              queryClient.invalidateQueries({ queryKey: ['attendance-daily', date] });
                            }}
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
