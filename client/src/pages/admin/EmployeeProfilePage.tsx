import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  FileText,
  TrendingUp,
  User,
  Phone,
  MapPin,
  Edit,
  Plus,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { employeesAPI } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

export function EmployeeProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: profileData, isLoading, refetch } = useQuery({
    queryKey: ['employee-profile', id],
    queryFn: async () => {
      const response = await employeesAPI.getProfile(id!);
      return response.data;
    },
    enabled: !!id,
  });


  if (isLoading) {
    return (
      <MainLayout title="Employee Profile" description="Loading employee details...">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      </MainLayout>
    );
  }

  if (!profileData) {
    return (
      <MainLayout title="Employee Profile" description="Employee not found">
        <div className="text-center py-8">
          <p className="text-muted-foreground">Employee not found</p>
          <Button onClick={() => navigate('/admin/employees')} className="mt-4">
            Back to Employees
          </Button>
        </div>
      </MainLayout>
    );
  }

  const { employee, salarySettings, salaryPromotions, salaryHistory, loans, advances, attendanceSummary } = profileData;

  return (
    <MainLayout title="Employee Profile" description={`Viewing profile for ${employee.fullName}`}>
      <div className="space-y-6">
        {/* Back Button */}
        <Button variant="ghost" onClick={() => navigate('/admin/employees')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Employees
        </Button>

        {/* Employee Header Card */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl">{employee.fullName}</CardTitle>
                <CardDescription className="mt-1">
                  {employee.employeeId} • {employee.department.name}
                  {employee.role && ` • ${employee.role.name}`}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Link to={`/admin/employees/${id}/edit`}>
                  <Button variant="outline">
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Profile
                  </Button>
                </Link>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Phone</p>
                  <p className="text-sm text-muted-foreground">{employee.phone || 'Not provided'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Address</p>
                  <p className="text-sm text-muted-foreground">
                    {employee.address?.line1
                      ? `${employee.address.line1}${employee.address.city ? `, ${employee.address.city}` : ''}`
                      : 'Not provided'}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Joined Date</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(employee.hireDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant={employee.isActive ? 'default' : 'secondary'}>
                  {employee.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Salary Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Salary Information
            </CardTitle>
            <CardDescription>All salaries are calculated on a daily basis</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                Employee salary is calculated based on daily attendance and the role worked each day. 
                Daily wage rates are set per role in the Roles management section.
              </p>
              {employee.role?.dailyWage && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-sm">
                    <span className="font-medium">Default Role:</span> {employee.role.name} - 
                    <span className="font-semibold ml-1">{formatCurrency(employee.role.dailyWage)}/day</span>
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Salary Promotions History */}
        {salaryPromotions && salaryPromotions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Salary Promotions History
              </CardTitle>
              <CardDescription>Timeline of salary changes and promotions</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Effective From</TableHead>
                    <TableHead>Salary Type</TableHead>
                    <TableHead>Base Salary</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Changed By</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salaryPromotions.map((promotion: any) => (
                    <TableRow key={promotion.id}>
                      <TableCell>{new Date(promotion.effectiveFrom).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge variant="outline">Daily Wage</Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(promotion.baseSalary)}/day
                      </TableCell>
                      <TableCell>{promotion.reason}</TableCell>
                      <TableCell>{promotion.changedBy?.fullName || promotion.changedBy?.username || 'N/A'}</TableCell>
                      <TableCell>{new Date(promotion.changedAt).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Salary History (Payouts) */}
        {salaryHistory && salaryHistory.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Salary Payout History
              </CardTitle>
              <CardDescription>Monthly salary calculations and payouts</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead>Base/Daily Wage</TableHead>
                    <TableHead>Bonus</TableHead>
                    <TableHead>Advances</TableHead>
                    <TableHead>Loans</TableHead>
                    <TableHead>Net Salary</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salaryHistory.map((salary: any) => (
                    <TableRow key={salary.id}>
                      <TableCell>{new Date(salary.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</TableCell>
                      <TableCell>
                        {salary.baseSalary !== null
                          ? formatCurrency(salary.baseSalary)
                          : formatCurrency(salary.dailyWageTotal)}
                      </TableCell>
                      <TableCell>{formatCurrency(salary.bonus)}</TableCell>
                      <TableCell className="text-red-600">-{formatCurrency(salary.advanceDeductions)}</TableCell>
                      <TableCell className="text-red-600">-{formatCurrency(salary.loanDeductions)}</TableCell>
                      <TableCell className="font-semibold">{formatCurrency(salary.totalSalary)}</TableCell>
                      <TableCell>
                        <Badge variant={salary.status === 'FINALIZED' ? 'default' : 'secondary'}>
                          {salary.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Loans */}
        {loans && loans.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Loans
                  </CardTitle>
                  <CardDescription>Active loans and repayment schedule</CardDescription>
                </div>
                <Link to="/admin/loans">
                  <Button variant="outline">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Loan
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {loans.map((loan: any) => (
                  <div key={loan.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium">Loan Amount: {formatCurrency(loan.loanAmount)}</p>
                        <p className="text-sm text-muted-foreground">
                          Remaining Balance: <span className="font-medium">{formatCurrency(loan.remainingBalance)}</span>
                        </p>
                      </div>
                      <Badge variant={loan.status === 'ACTIVE' ? 'default' : 'secondary'}>
                        {loan.status}
                      </Badge>
                    </div>
                    {loan.installments && loan.installments.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm font-medium mb-2">Installments:</p>
                        <div className="space-y-1">
                          {loan.installments.slice(0, 5).map((inst: any) => (
                            <div key={inst.id} className="flex items-center justify-between text-sm">
                              <span>
                                #{inst.installmentNumber} - {new Date(inst.dueMonth).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                              </span>
                              <span className={inst.status === 'PAID' ? 'text-green-600' : 'text-muted-foreground'}>
                                {formatCurrency(inst.amount)} ({inst.status})
                              </span>
                            </div>
                          ))}
                          {loan.installments.length > 5 && (
                            <p className="text-xs text-muted-foreground mt-2">
                              +{loan.installments.length - 5} more installments
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Advances */}
        {advances && advances.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Advance Salaries
              </CardTitle>
              <CardDescription>Advance salary records</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Slip</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {advances.map((advance: any) => (
                    <TableRow key={advance.id}>
                      <TableCell>{new Date(advance.advanceDate).toLocaleDateString()}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(advance.amount)}</TableCell>
                      <TableCell>
                        {advance.slipPhotoUrl && (
                          <a
                            href={advance.slipPhotoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-accent hover:underline flex items-center gap-1"
                          >
                            View Slip
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{advance.notes || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Attendance Summary */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Attendance Summary
                </CardTitle>
                <CardDescription>Last 3 months attendance statistics</CardDescription>
              </div>
              <Link to={`/admin/employees/${id}/attendance/calendar`}>
                <Button variant="outline">
                  View Calendar
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {attendanceSummary && (
              <div className="grid gap-4 md:grid-cols-4">
                <div>
                  <p className="text-sm text-muted-foreground">Present Days</p>
                  <p className="text-2xl font-bold">{attendanceSummary.presentDays}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Half Days</p>
                  <p className="text-2xl font-bold">{attendanceSummary.halfDays}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Absent Days</p>
                  <p className="text-2xl font-bold">{attendanceSummary.absentDays}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Other</p>
                  <p className="text-2xl font-bold">{attendanceSummary.otherDays}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
