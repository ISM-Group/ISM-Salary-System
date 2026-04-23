import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { holidaysAPI, employeesAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import {
  Calendar,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  X,
  Users,
} from 'lucide-react';

/** Shape of an assigned employee from the API */
interface AssignedEmployee {
  employeeId: string;
  employeeName: string;
  employeeCode: string;
}

/** Shape of a holiday record from the API */
interface Holiday {
  id: string;
  date: string;
  name: string;
  type: 'PAID' | 'UNPAID';
  scope: 'GLOBAL' | 'PER_EMPLOYEE';
  assignedEmployees: AssignedEmployee[];
  assignedEmployeeCount: number;
  createdAt: string;
  updatedAt: string;
}

/** Shape of an employee record for the employee selector */
interface Employee {
  id: string;
  fullName: string;
  employeeId: string;
  departmentName?: string;
}

/** Form data for creating/editing a holiday */
interface HolidayFormData {
  date: string;
  name: string;
  type: 'PAID' | 'UNPAID';
  scope: 'GLOBAL' | 'PER_EMPLOYEE';
  employeeIds: string[];
}

/**
 * HolidaysPage — Manages holidays with GLOBAL and PER_EMPLOYEE scoping.
 *
 * Features:
 * - List all holidays with scope and employee assignment info
 * - Create/edit holidays with type (PAID/UNPAID) and scope (GLOBAL/PER_EMPLOYEE)
 * - Assign specific employees to PER_EMPLOYEE holidays
 * - Delete holidays (ADMIN only)
 * - Filter by year
 *
 * Business rules:
 * - GLOBAL holidays apply to all employees
 * - PER_EMPLOYEE holidays only apply to specifically assigned employees
 * - PAID holidays count as paid days off in salary calculation
 * - UNPAID holidays are unpaid leave days
 * - Holidays integrate with daily salary releases and monthly salary calculation
 */
// PUBLIC_INTERFACE
export function HolidaysPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  // State
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<HolidayFormData>({
    date: '',
    name: '',
    type: 'PAID',
    scope: 'GLOBAL',
    employeeIds: [],
  });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Employee search for PER_EMPLOYEE scope
  const [employeeSearch, setEmployeeSearch] = useState('');

  /**
   * Fetches holidays for the selected year.
   */
  const fetchHolidays = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const from = `${selectedYear}-01-01`;
      const to = `${selectedYear}-12-31`;
      const result = await holidaysAPI.getAll({ from, to });
      setHolidays(result.data || []);
    } catch (err: any) {
      console.error('Failed to fetch holidays:', err);
      setMessage({ type: 'error', text: 'Failed to fetch holidays.' });
      setHolidays([]);
    } finally {
      setLoading(false);
    }
  }, [selectedYear]);

  /**
   * Fetches all active employees for the employee selector.
   */
  const fetchEmployees = useCallback(async () => {
    try {
      const result = await employeesAPI.getAll({ isActive: true });
      setEmployees(
        (result.data || []).map((e: any) => ({
          id: e.id,
          fullName: e.fullName || e.full_name,
          employeeId: e.employeeId || e.employee_id,
          departmentName: e.departmentName || e.department_name,
        }))
      );
    } catch (err: any) {
      console.error('Failed to fetch employees:', err);
    }
  }, []);

  useEffect(() => {
    fetchHolidays();
  }, [fetchHolidays]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  /**
   * Resets the form to default values.
   */
  const resetForm = () => {
    setFormData({
      date: '',
      name: '',
      type: 'PAID',
      scope: 'GLOBAL',
      employeeIds: [],
    });
    setEditingId(null);
    setShowForm(false);
    setEmployeeSearch('');
  };

  /**
   * Opens the form for creating a new holiday.
   */
  const handleNew = () => {
    resetForm();
    setShowForm(true);
  };

  /**
   * Opens the form for editing an existing holiday.
   */
  const handleEdit = (holiday: Holiday) => {
    setFormData({
      date: holiday.date.slice(0, 10),
      name: holiday.name,
      type: holiday.type,
      scope: holiday.scope,
      employeeIds: holiday.assignedEmployees.map((e) => e.employeeId),
    });
    setEditingId(holiday.id);
    setShowForm(true);
  };

  /**
   * Saves (creates or updates) a holiday.
   */
  const handleSave = async () => {
    if (!formData.date || !formData.name) {
      setMessage({ type: 'error', text: 'Date and name are required.' });
      return;
    }

    if (formData.scope === 'PER_EMPLOYEE' && formData.employeeIds.length === 0) {
      setMessage({ type: 'error', text: 'Please select at least one employee for PER_EMPLOYEE scope.' });
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      if (editingId) {
        await holidaysAPI.update(editingId, {
          date: formData.date,
          name: formData.name,
          type: formData.type,
          scope: formData.scope,
          employeeIds: formData.scope === 'PER_EMPLOYEE' ? formData.employeeIds : undefined,
        });
        setMessage({ type: 'success', text: 'Holiday updated successfully.' });
      } else {
        await holidaysAPI.create({
          date: formData.date,
          name: formData.name,
          type: formData.type,
          scope: formData.scope,
          employeeIds: formData.scope === 'PER_EMPLOYEE' ? formData.employeeIds : undefined,
        });
        setMessage({ type: 'success', text: 'Holiday created successfully.' });
      }
      resetForm();
      await fetchHolidays();
    } catch (err: any) {
      const errMsg = err.response?.data?.error || 'Failed to save holiday.';
      setMessage({ type: 'error', text: errMsg });
    } finally {
      setSaving(false);
    }
  };

  /**
   * Deletes a holiday.
   */
  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this holiday?')) return;
    setDeletingId(id);
    setMessage(null);
    try {
      await holidaysAPI.delete(id);
      setMessage({ type: 'success', text: 'Holiday deleted successfully.' });
      await fetchHolidays();
    } catch (err: any) {
      const errMsg = err.response?.data?.error || 'Failed to delete holiday.';
      setMessage({ type: 'error', text: errMsg });
    } finally {
      setDeletingId(null);
    }
  };

  /**
   * Toggles an employee's selection in the form.
   */
  const toggleEmployee = (empId: string) => {
    setFormData((prev) => ({
      ...prev,
      employeeIds: prev.employeeIds.includes(empId)
        ? prev.employeeIds.filter((id) => id !== empId)
        : [...prev.employeeIds, empId],
    }));
  };

  /**
   * Filters employees based on search text.
   */
  const filteredEmployees = employees.filter(
    (e) =>
      e.fullName.toLowerCase().includes(employeeSearch.toLowerCase()) ||
      e.employeeId.toLowerCase().includes(employeeSearch.toLowerCase()) ||
      (e.departmentName || '').toLowerCase().includes(employeeSearch.toLowerCase())
  );

  // Count holidays by type
  const paidCount = holidays.filter((h) => h.type === 'PAID').length;
  const unpaidCount = holidays.filter((h) => h.type === 'UNPAID').length;
  const globalCount = holidays.filter((h) => h.scope === 'GLOBAL').length;
  const perEmployeeCount = holidays.filter((h) => h.scope === 'PER_EMPLOYEE').length;

  return (
    <MainLayout title="Holidays" description="Manage public holidays and employee-specific holidays">
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Holiday Management</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage GLOBAL holidays (all employees) and PER_EMPLOYEE holidays (specific employees).
              PAID holidays are included in salary calculations as paid days off.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        {/* Controls Row */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              {/* Year Selector */}
              <div className="flex flex-col gap-1">
                <Label htmlFor="holiday-year">Year</Label>
                <Input
                  id="holiday-year"
                  type="number"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="w-32"
                  min={2020}
                  max={2050}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                {isAdmin && (
                  <Button
                    onClick={handleNew}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Holiday
                  </Button>
                )}
                <Button onClick={fetchHolidays} disabled={loading} variant="outline">
                  <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status Message */}
        {message && (
          <div
            className={`flex items-center gap-2 rounded-lg p-3 text-sm ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            {message.text}
          </div>
        )}

        {/* Summary Cards */}
        {holidays.length > 0 && (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-gray-500 uppercase">
                  Total Holidays
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-bold text-gray-900">{holidays.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-gray-500 uppercase">
                  Paid Holidays
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-bold text-green-600">{paidCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-gray-500 uppercase">
                  Global
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-bold text-blue-600">{globalCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-gray-500 uppercase">
                  Per-Employee
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-bold text-purple-600">{perEmployeeCount}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Holiday Create/Edit Form */}
        {showForm && (
          <Card className="border-blue-200">
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <span>{editingId ? 'Edit Holiday' : 'Add New Holiday'}</span>
                <Button variant="ghost" size="sm" onClick={resetForm}>
                  <X className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {/* Date */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="holiday-date">Date *</Label>
                  <Input
                    id="holiday-date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>

                {/* Name */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="holiday-name">Holiday Name *</Label>
                  <Input
                    id="holiday-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Poya Day, New Year"
                  />
                </div>

                {/* Type */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="holiday-type">Type *</Label>
                  <select
                    id="holiday-type"
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value as 'PAID' | 'UNPAID' })
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="PAID">Paid</option>
                    <option value="UNPAID">Unpaid</option>
                  </select>
                </div>

                {/* Scope */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="holiday-scope">Scope *</Label>
                  <select
                    id="holiday-scope"
                    value={formData.scope}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        scope: e.target.value as 'GLOBAL' | 'PER_EMPLOYEE',
                        employeeIds: e.target.value === 'GLOBAL' ? [] : formData.employeeIds,
                      })
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="GLOBAL">Global (All Employees)</option>
                    <option value="PER_EMPLOYEE">Per-Employee (Specific Employees)</option>
                  </select>
                </div>
              </div>

              {/* Employee Selector (for PER_EMPLOYEE scope) */}
              {formData.scope === 'PER_EMPLOYEE' && (
                <div className="mt-4">
                  <Label className="mb-2 block">Assign Employees *</Label>
                  <div className="border rounded-lg p-3">
                    {/* Selected employees */}
                    {formData.employeeIds.length > 0 && (
                      <div className="mb-3 flex flex-wrap gap-2">
                        {formData.employeeIds.map((empId) => {
                          const emp = employees.find((e) => e.id === empId);
                          return (
                            <Badge
                              key={empId}
                              variant="outline"
                              className="bg-blue-50 text-blue-700 border-blue-300 flex items-center gap-1 pr-1"
                            >
                              <span>{emp?.fullName || empId}</span>
                              <button
                                type="button"
                                onClick={() => toggleEmployee(empId)}
                                className="ml-1 rounded-full p-0.5 hover:bg-blue-200"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          );
                        })}
                      </div>
                    )}

                    {/* Search input */}
                    <Input
                      value={employeeSearch}
                      onChange={(e) => setEmployeeSearch(e.target.value)}
                      placeholder="Search employees by name, ID, or department..."
                      className="mb-2"
                    />

                    {/* Employee list */}
                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {filteredEmployees.map((emp) => {
                        const isSelected = formData.employeeIds.includes(emp.id);
                        return (
                          <button
                            key={emp.id}
                            type="button"
                            onClick={() => toggleEmployee(emp.id)}
                            className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors ${
                              isSelected
                                ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                                : 'hover:bg-gray-100 text-gray-700'
                            }`}
                          >
                            <span>
                              {emp.fullName}{' '}
                              <span className="text-xs text-gray-400">({emp.employeeId})</span>
                            </span>
                            {emp.departmentName && (
                              <span className="text-xs text-gray-400">{emp.departmentName}</span>
                            )}
                            {isSelected && <CheckCircle className="h-4 w-4 text-blue-600" />}
                          </button>
                        );
                      })}
                      {filteredEmployees.length === 0 && (
                        <p className="text-sm text-gray-400 text-center py-2">No employees found.</p>
                      )}
                    </div>

                    <p className="text-xs text-gray-500 mt-2">
                      {formData.employeeIds.length} employee(s) selected
                    </p>
                  </div>
                </div>
              )}

              {/* Save/Cancel buttons */}
              <div className="mt-4 flex gap-2">
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : editingId ? (
                    'Update Holiday'
                  ) : (
                    'Create Holiday'
                  )}
                </Button>
                <Button variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Holidays Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Holidays for {selectedYear}
              {holidays.length > 0 && (
                <span className="ml-2 text-sm font-normal text-gray-500">
                  ({holidays.length} holiday{holidays.length !== 1 ? 's' : ''})
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-500">Loading...</span>
              </div>
            ) : holidays.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <Calendar className="mb-2 h-10 w-10 text-gray-300" />
                <p className="text-sm">No holidays found for {selectedYear}.</p>
                {isAdmin && (
                  <p className="text-xs text-gray-400 mt-1">
                    Click &quot;Add Holiday&quot; to create one.
                  </p>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="text-center">Type</TableHead>
                      <TableHead className="text-center">Scope</TableHead>
                      <TableHead className="text-center">Employees</TableHead>
                      {isAdmin && <TableHead className="text-center">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {holidays.map((holiday) => (
                      <TableRow key={holiday.id}>
                        <TableCell className="font-mono text-sm">
                          {new Date(holiday.date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </TableCell>
                        <TableCell className="font-medium">{holiday.name}</TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="outline"
                            className={
                              holiday.type === 'PAID'
                                ? 'bg-green-50 text-green-700 border-green-300'
                                : 'bg-orange-50 text-orange-700 border-orange-300'
                            }
                          >
                            {holiday.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="outline"
                            className={
                              holiday.scope === 'GLOBAL'
                                ? 'bg-blue-50 text-blue-700 border-blue-300'
                                : 'bg-purple-50 text-purple-700 border-purple-300'
                            }
                          >
                            {holiday.scope === 'GLOBAL' ? 'Global' : 'Per-Employee'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {holiday.scope === 'GLOBAL' ? (
                            <span className="text-sm text-gray-500">All</span>
                          ) : (
                            <div className="flex items-center justify-center gap-1">
                              <Users className="h-4 w-4 text-purple-500" />
                              <span className="text-sm font-medium">
                                {holiday.assignedEmployeeCount}
                              </span>
                              {holiday.assignedEmployees.length > 0 && (
                                <span
                                  className="text-xs text-gray-400 cursor-help"
                                  title={holiday.assignedEmployees
                                    .map((e) => e.employeeName)
                                    .join(', ')}
                                >
                                  (hover)
                                </span>
                              )}
                            </div>
                          )}
                        </TableCell>
                        {isAdmin && (
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEdit(holiday)}
                                className="text-blue-600 border-blue-300 hover:bg-blue-50"
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDelete(holiday.id)}
                                disabled={deletingId === holiday.id}
                                className="text-red-600 border-red-300 hover:bg-red-50"
                              >
                                {deletingId === holiday.id ? (
                                  <RefreshCw className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
