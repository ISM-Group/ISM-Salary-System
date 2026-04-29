import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { attendanceAPI, employeesAPI, departmentsAPI, rolesAPI, getApiErrorMessage } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PageSkeleton, TableLoadingRows } from '@/components/ui/loading-spinner';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Search, CalendarDays, Users, CheckCircle2, XCircle, Save, Loader2 } from 'lucide-react';

type AttendanceStatus = 'PRESENT' | 'ABSENT';

export function AttendanceEntryPage() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [departmentId, setDepartmentId] = useState('');
  const [search, setSearch] = useState('');
  const [bulkRole, setBulkRole] = useState('');
  const [localStatuses, setLocalStatuses] = useState<Record<string, AttendanceStatus>>({});
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: employeesData, isLoading: isEmployeesLoading } = useQuery({
    queryKey: ['employees-for-attendance'],
    queryFn: async () => (await employeesAPI.getAll({ isActive: true })).data,
  });

  const { data: departmentsData, isLoading: isDepartmentsLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => (await departmentsAPI.getAll()).data,
  });

  const { data: deptEmployeesData, isLoading: isDeptEmployeesLoading } = useQuery({
    queryKey: ['employees-by-department', departmentId],
    enabled: !!departmentId,
    queryFn: async () => (await employeesAPI.getAll({ departmentId, isActive: true })).data,
  });

  const { data: rolesData, isLoading: isRolesLoading } = useQuery({
    queryKey: ['roles-for-attendance', departmentId],
    enabled: !!departmentId,
    queryFn: async () => (await rolesAPI.getByDepartment(departmentId)).data,
  });

  const { data: dailyData, isLoading: isDailyLoading, refetch } = useQuery({
    queryKey: ['attendance-daily', date],
    queryFn: async () => (await attendanceAPI.getDaily(date)).data,
  });

  const employees: any[] = useMemo(() => {
    if (departmentId) return deptEmployeesData || [];
    return employeesData || [];
  }, [employeesData, deptEmployeesData, departmentId]);

  const records: any[] = useMemo(() => dailyData || [], [dailyData]);

  // What's actually saved in the DB for this date
  const savedStatuses = useMemo(() => {
    const m: Record<string, AttendanceStatus> = {};
    records.forEach((r: any) => { if (r.employeeId) m[r.employeeId] = r.status; });
    return m;
  }, [records]);

  // Initialise local state whenever DB data or employee list changes
  useEffect(() => {
    setLocalStatuses((prev) => {
      const next: Record<string, AttendanceStatus> = {};
      employees.forEach((e: any) => {
        // Prefer saved DB value, then any existing local edit, then default PRESENT
        next[e.id] = savedStatuses[e.id] ?? prev[e.id] ?? 'PRESENT';
      });
      return next;
    });
  }, [dailyData, employees]);

  const filteredEmployees = useMemo(() => {
    const list = employees || [];
    if (!search) return list;
    const s = search.toLowerCase();
    return list.filter((e: any) =>
      (e.fullName || '').toLowerCase().includes(s) || (e.employeeId || '').toLowerCase().includes(s)
    );
  }, [employees, search]);

  // An employee is "unsaved" if their local status differs from what's in the DB,
  // OR if no DB record exists yet (new record needed)
  const unsavedIds = useMemo(() => {
    return new Set(
      filteredEmployees
        .filter((e: any) => localStatuses[e.id] !== savedStatuses[e.id] || !(e.id in savedStatuses))
        .map((e: any) => e.id)
    );
  }, [filteredEmployees, localStatuses, savedStatuses]);

  const presentCount = useMemo(
    () => filteredEmployees.filter((e: any) => (localStatuses[e.id] ?? 'PRESENT') === 'PRESENT').length,
    [filteredEmployees, localStatuses]
  );
  const absentCount = filteredEmployees.length - presentCount;

  const setStatus = (empId: string, status: AttendanceStatus) => {
    setLocalStatuses((prev) => ({ ...prev, [empId]: status }));
  };

  const markAllPresent = () => {
    setLocalStatuses((prev) => {
      const next = { ...prev };
      filteredEmployees.forEach((e: any) => { next[e.id] = 'PRESENT'; });
      return next;
    });
  };

  const saveAttendance = async () => {
    if (!filteredEmployees.length) return;
    setSaving(true);
    try {
      await Promise.all(
        filteredEmployees.map((e: any) =>
          attendanceAPI.create({
            employeeId: e.id,
            date,
            status: localStatuses[e.id] ?? 'PRESENT',
            notes: '',
            roleId: bulkRole || e.roleId || null,
          })
        )
      );
      await refetch();
      queryClient.invalidateQueries({ queryKey: ['attendance-daily', date] });
      toast({ title: `Attendance saved — ${filteredEmployees.length} employee(s)` });
    } catch (err) {
      toast({ title: getApiErrorMessage(err, 'Failed to save attendance'), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const isInitialLoading = isEmployeesLoading && isDepartmentsLoading && isDailyLoading;
  const isTableLoading = isEmployeesLoading || isDeptEmployeesLoading || isDailyLoading || (departmentId ? isRolesLoading : false);

  return (
    <MainLayout title="Attendance Entry" description="Record daily attendance for employees">
      {isInitialLoading ? (
        <PageSkeleton variant="table" />
      ) : (
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

            <Button
              size="sm"
              onClick={saveAttendance}
              disabled={saving || filteredEmployees.length === 0}
              className="h-9 gap-1.5"
            >
              {saving ? (
                <><Loader2 className="h-4 w-4 animate-spin" />Saving...</>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Attendance
                  {unsavedIds.size > 0 && (
                    <span className="ml-1 rounded-full bg-white/20 px-1.5 text-xs font-bold">
                      {unsavedIds.size}
                    </span>
                  )}
                </>
              )}
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
            {unsavedIds.size > 0 && (
              <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                ● {unsavedIds.size} unsaved
              </span>
            )}
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
                {isTableLoading ? (
                  <TableLoadingRows rows={8} columns={4} />
                ) : filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                      {search ? 'No employees match your search.' : 'Select a department or search to view employees.'}
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp: any) => {
                    const status = localStatuses[emp.id] ?? 'PRESENT';
                    const isUnsaved = unsavedIds.has(emp.id);
                    const rec = records.find((r: any) => r.employeeId === emp.id);
                    return (
                      <tr
                        key={emp.id}
                        className={cn(
                          'transition-colors hover:bg-white/20 dark:hover:bg-white/4',
                          isUnsaved && 'bg-amber-50/40 dark:bg-amber-900/10'
                        )}
                      >
                        <td className="px-5 py-3 font-medium text-slate-900 dark:text-slate-100">
                          <span>{emp.fullName}</span>
                          {isUnsaved && (
                            <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-amber-500 align-middle" title="Unsaved change" />
                          )}
                        </td>
                        <td className="px-5 py-3 font-mono text-xs text-slate-500 dark:text-slate-400">
                          {emp.employeeId}
                        </td>
                        <td className="px-5 py-3 text-slate-600 dark:text-slate-400">
                          {rec?.roleName || emp.roleName || <span className="text-slate-400 dark:text-slate-500 italic text-xs">default</span>}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => setStatus(emp.id, 'PRESENT')}
                              className={cn(
                                'rounded-lg border px-3 py-1 text-xs font-medium transition-colors',
                                status === 'PRESENT'
                                  ? 'border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
                                  : 'border-slate-200 bg-transparent text-slate-400 hover:border-emerald-200 hover:text-emerald-600 dark:border-slate-700 dark:text-slate-500'
                              )}
                            >
                              Present
                            </button>
                            <button
                              onClick={() => setStatus(emp.id, 'ABSENT')}
                              className={cn(
                                'rounded-lg border px-3 py-1 text-xs font-medium transition-colors',
                                status === 'ABSENT'
                                  ? 'border-red-300 bg-red-100 text-red-800 dark:border-red-800 dark:bg-red-900/50 dark:text-red-300'
                                  : 'border-slate-200 bg-transparent text-slate-400 hover:border-red-200 hover:text-red-600 dark:border-slate-700 dark:text-slate-500'
                              )}
                            >
                              Absent
                            </button>
                          </div>
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
      )}
    </MainLayout>
  );
}
