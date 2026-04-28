import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Pagination } from '@/components/ui/pagination';
import { Link } from 'react-router-dom';
import { Plus, Search, Eye, Pencil, Loader2, Trash2, UserRound } from 'lucide-react';
import { employeesAPI, departmentsAPI, getApiErrorMessage, getApiResourceUrl } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

// PUBLIC_INTERFACE
/**
 * EmployeesPage — Manages employee list with server-side pagination,
 * search, and filtering by department/status.
 */
export function EmployeesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const limit = 20;

  // Fetch departments for filter
  const { data: departmentsData } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const response = await departmentsAPI.getAll();
      return response.data;
    },
  });

  // Fetch employees with server-side pagination
  const { data: employeesResponse, isLoading, refetch } = useQuery({
    queryKey: ['employees', departmentFilter, statusFilter, searchQuery, page, limit],
    queryFn: async () => {
      const params: any = { page, limit };
      if (departmentFilter !== 'all') {
        params.departmentId = departmentFilter;
      }
      if (statusFilter !== 'all') {
        params.isActive = statusFilter === 'active';
      }
      if (searchQuery) {
        params.search = searchQuery;
      }
      const response = await employeesAPI.getAll(params);
      return response;
    },
  });

  const employees = employeesResponse?.data || [];
  const pagination = employeesResponse?.pagination;
  const departments = departmentsData || [];

  // Reset page when filters change
  const handleFilterChange = (setter: (val: string) => void, val: string) => {
    setter(val);
    setPage(1);
  };

  return (
    <MainLayout title="Employees" description="Manage your organization's employees">
      <div className="space-y-4 sm:space-y-6">
        {error && (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        {/* Filters and Actions */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col sm:flex-row flex-1 gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or ID..."
                value={searchQuery}
                onChange={(e) => handleFilterChange(setSearchQuery, e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={departmentFilter}
              onChange={(e) => handleFilterChange(setDepartmentFilter, e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm w-full sm:w-32"
            >
              <option value="all">All Depts</option>
              {departments.map((dept: any) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => handleFilterChange(setStatusFilter, e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm w-full sm:w-28"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <Link to="/admin/employees/new">
            <Button variant="accent" className="w-full sm:w-auto">
              <Plus className="h-4 w-4" />
              Add Employee
            </Button>
          </Link>
        </div>

        {/* Table */}
        <div className="table-container">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-accent" />
                  </TableCell>
                </TableRow>
              ) : (
                employees.map((employee: any) => (
                  <TableRow key={employee.id} className="group">
                    <TableCell className="font-mono text-sm">{employee.employeeId}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                          {employee.photoUrl ? (
                            <img src={getApiResourceUrl(employee.photoUrl)} alt={`${employee.fullName} photo`} className="h-full w-full object-cover" />
                          ) : (
                            <UserRound className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <p className="font-medium">{employee.fullName}</p>
                      </div>
                    </TableCell>
                    <TableCell>{employee.department?.name || '-'}</TableCell>
                    <TableCell>{employee.role?.name || '-'}</TableCell>
                    <TableCell className="text-sm">{employee.phone || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={employee.isActive ? 'default' : 'outline'}>
                        {employee.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="flex gap-2">
                      <Link to={`/admin/employees/${employee.id}`}>
                        <Button variant="ghost" size="icon">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Link to={`/admin/employees/${employee.id}/edit`}>
                        <Button variant="ghost" size="icon">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={async () => {
                          if (!window.confirm('Delete this employee?')) {
                            return;
                          }
                          try {
                            setError(null);
                            await employeesAPI.delete(employee.id);
                            await refetch();
                            toast({ title: 'Employee deleted' });
                          } catch (err) {
                            setError(getApiErrorMessage(err, 'Failed to delete employee.'));
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
              {!isLoading && employees.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    No employees found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Server-side pagination controls */}
        {pagination && (
          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            limit={pagination.limit}
            onPageChange={setPage}
          />
        )}
      </div>
    </MainLayout>
  );
}
