import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { departmentsAPI, employeesAPI, getApiErrorMessage, getApiFieldErrors, getApiResourceUrl, rolesAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormErrors, isIsoDate } from '@/lib/formValidation';
import { useToast } from '@/hooks/use-toast';
import { Camera, ImagePlus, UserRound, X } from 'lucide-react';

type EmployeeFormField = 'fullName' | 'departmentId' | 'hireDate' | 'photo' | 'form';

export function EmployeeFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();

  const [employeeId, setEmployeeId] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [roleId, setRoleId] = useState('');
  const [hireDate, setHireDate] = useState(new Date().toISOString().slice(0, 10));
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');
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
    setPhone(employeeData.phone || '');
    setDepartmentId(employeeData.departmentId || '');
    setRoleId(employeeData.roleId || '');
    setHireDate(employeeData.hireDate ? String(employeeData.hireDate).slice(0, 10) : new Date().toISOString().slice(0, 10));
    setPhotoPreview(employeeData.photoUrl ? getApiResourceUrl(employeeData.photoUrl) : '');
  }, [employeeData]);

  useEffect(() => {
    if (!photo) {
      return;
    }

    const objectUrl = URL.createObjectURL(photo);
    setPhotoPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [photo]);

  const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    if (!file) {
      return;
    }
    if (!file.type.startsWith('image/')) {
      setErrors((current) => ({ ...current, photo: 'Select an image file.' }));
      return;
    }
    setErrors((current) => ({ ...current, photo: undefined }));
    setPhoto(file);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const nextErrors: FormErrors<EmployeeFormField> = {};
    if (!fullName.trim()) nextErrors.fullName = 'Full name is required.';
    if (!departmentId) nextErrors.departmentId = 'Select a department.';
    if (!isIsoDate(hireDate)) nextErrors.hireDate = 'Select a valid hire date.';

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      return;
    }

    const payload = new FormData();
    payload.append('fullName', fullName.trim());
    payload.append('phone', phone.trim());
    payload.append('departmentId', departmentId);
    payload.append('roleId', roleId || '');
    payload.append('hireDate', hireDate);
    if (photo) {
      payload.append('photo', photo);
    }

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
            {isEdit && (
              <div>
                <Label htmlFor="employeeId">Employee ID</Label>
                <Input id="employeeId" value={employeeId} readOnly className="mt-1 bg-muted font-mono" />
              </div>
            )}
            <div className={isEdit ? '' : 'md:col-span-2'}>
              <Label htmlFor="fullName">Full Name</Label>
              <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1" required />
              {errors.fullName && <p className="mt-1 text-xs text-red-600">{errors.fullName}</p>}
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="departmentId">Department</Label>
              <select
                id="departmentId"
                className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
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
            <div>
              <Label htmlFor="roleId">Role</Label>
              <select
                id="roleId"
                className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
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
            </div>
            <div>
              <Label htmlFor="hireDate">Hire Date</Label>
              <Input id="hireDate" type="date" value={hireDate} onChange={(e) => setHireDate(e.target.value)} className="mt-1" required />
              {errors.hireDate && <p className="mt-1 text-xs text-red-600">{errors.hireDate}</p>}
            </div>
            <div className="md:col-span-2">
              <Label>Employee Photo</Label>
              <div className="mt-2 flex flex-col gap-3 rounded-md border border-border p-3 sm:flex-row sm:items-center">
                <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                  {photoPreview ? (
                    <img src={photoPreview} alt={`${fullName || 'Employee'} photo`} className="h-full w-full object-cover" />
                  ) : (
                    <UserRound className="h-10 w-10 text-muted-foreground" />
                  )}
                </div>
                <div className="flex flex-1 flex-wrap gap-2">
                  <input id="photo-upload" type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                  <input id="photo-camera" type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoChange} />
                  <Button type="button" variant="outline" onClick={() => document.getElementById('photo-upload')?.click()}>
                    <ImagePlus className="h-4 w-4" />
                    Upload Photo
                  </Button>
                  <Button type="button" variant="outline" onClick={() => document.getElementById('photo-camera')?.click()}>
                    <Camera className="h-4 w-4" />
                    Take Photo
                  </Button>
                  {photo && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setPhoto(null);
                        setPhotoPreview(employeeData?.photoUrl ? getApiResourceUrl(employeeData.photoUrl) : '');
                      }}
                    >
                      <X className="h-4 w-4" />
                      Clear
                    </Button>
                  )}
                </div>
              </div>
              {errors.photo && <p className="mt-1 text-xs text-red-600">{errors.photo}</p>}
            </div>
            <Button type="submit" disabled={saving} className="md:col-span-2 justify-self-start">
              {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Employee'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </MainLayout>
  );
}
