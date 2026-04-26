import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { departmentsAPI, employeesAPI, getApiErrorMessage, getApiFieldErrors, rolesAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormErrors, isEmail, isIsoDate } from '@/lib/formValidation';
import { useToast } from '@/hooks/use-toast';

type EmployeeFormField = 'employeeId' | 'fullName' | 'email' | 'departmentId' | 'hireDate' | 'form';

export function EmployeeFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();

  const [employeeId, setEmployeeId] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [roleId, setRoleId] = useState('');
  const [hireDate, setHireDate] = useState(new Date().toISOString().slice(0, 10));
  const [errors, setErrors] = useState<FormErrors<EmployeeFormField>>({});
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const { data: departmentsData } = useQuery({
    queryKey: ['departments-for-employee-form'],
    queryFn: async () => (await departmentsAPI.getAll()).data,
  });
  const { data: rolesData } = useQuery({
    queryKey: ['roles-for-employee-form', departmentId],
    queryFn: async () => {
      const response = departmentId ? await rolesAPI.getByDepartment(departmentId) : await rolesAPI.getAll();
      return response.data;
    },
  });
  const { data: employeeData } = useQuery({
    queryKey: ['employee-edit', id],
    enabled: isEdit,
    queryFn: async () => (await employeesAPI.getById(id!)).data,
  });

  useEffect(() => {
    if (!employeeData) {
      return;
    }
    setEmployeeId(employeeData.employeeId || '');
    setFullName(employeeData.fullName || '');
    setEmail(employeeData.email || '');
    setPhone(employeeData.phone || '');
    setDepartmentId(employeeData.departmentId || '');
    setRoleId(employeeData.roleId || '');
    setHireDate(employeeData.hireDate ? String(employeeData.hireDate).slice(0, 10) : new Date().toISOString().slice(0, 10));
  }, [employeeData]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const nextErrors: FormErrors<EmployeeFormField> = {};
    if (!employeeId.trim()) nextErrors.employeeId = 'Employee ID is required.';
    if (!fullName.trim()) nextErrors.fullName = 'Full name is required.';
    if (email.trim() && !isEmail(email.trim())) nextErrors.email = 'Enter a valid email address.';
    if (!departmentId) nextErrors.departmentId = 'Select a department.';
    if (!isIsoDate(hireDate)) nextErrors.hireDate = 'Select a valid hire date.';

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      return;
    }

    const payload = {
      employeeId: employeeId.trim(),
      fullName: fullName.trim(),
      email: email.trim() || null,
      phone: phone.trim() || null,
      departmentId,
      roleId: roleId || null,
      hireDate,
    };

    setSaving(true);
    try {
      if (isEdit) {
        await employeesAPI.update(id!, payload);
        toast({ title: 'Employee updated' });
        navigate(`/admin/employees/${id}`);
      } else {
        await employeesAPI.create(payload);
        toast({ title: 'Employee created' });
        navigate('/admin/employees');
      }
    } catch (err) {
      setErrors({ ...getApiFieldErrors(err), form: getApiErrorMessage(err, 'Failed to save employee.') });
    } finally {
      setSaving(false);
    }
  };

  return (
    <MainLayout title={isEdit ? 'Edit Employee' : 'Add Employee'} description="Manage employee profile details">
      <Card>
        <CardHeader>
          <CardTitle>{isEdit ? 'Update Employee' : 'Create Employee'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={submit}>
            {errors.form && (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 md:col-span-2" role="alert">
                {errors.form}
              </p>
            )}
            <div>
              <Input value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} placeholder="Employee ID" required />
              {errors.employeeId && <p className="mt-1 text-xs text-red-600">{errors.employeeId}</p>}
            </div>
            <div>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name" required />
              {errors.fullName && <p className="mt-1 text-xs text-red-600">{errors.fullName}</p>}
            </div>
            <div>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
            </div>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" />
            <div>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                required
              >
                <option value="">Department</option>
                {(departmentsData || []).map((d: any) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
              {errors.departmentId && <p className="mt-1 text-xs text-red-600">{errors.departmentId}</p>}
            </div>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
            >
              <option value="">Role (optional)</option>
              {(rolesData || []).map((r: any) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            <div>
              <Input type="date" value={hireDate} onChange={(e) => setHireDate(e.target.value)} required />
              {errors.hireDate && <p className="mt-1 text-xs text-red-600">{errors.hireDate}</p>}
            </div>
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Employee'}</Button>
          </form>
        </CardContent>
      </Card>
    </MainLayout>
  );
}
