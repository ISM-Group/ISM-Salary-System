import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { departmentsAPI, employeesAPI, rolesAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
    const payload = { employeeId, fullName, email, phone, departmentId, roleId, hireDate };
    if (isEdit) {
      await employeesAPI.update(id!, payload);
      navigate(`/admin/employees/${id}`);
    } else {
      await employeesAPI.create(payload);
      navigate('/admin/employees');
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
            <Input value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} placeholder="Employee ID" required />
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name" required />
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" />
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
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
            <Input type="date" value={hireDate} onChange={(e) => setHireDate(e.target.value)} required />
            <Button type="submit">{isEdit ? 'Save Changes' : 'Create Employee'}</Button>
          </form>
        </CardContent>
      </Card>
    </MainLayout>
  );
}
