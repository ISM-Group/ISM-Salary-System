import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { selfServiceAPI } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { User, Calendar, CreditCard, FileText, Printer } from 'lucide-react';

// PUBLIC_INTERFACE
/**
 * EmployeeDashboardPage — Self-service dashboard for employees.
 * Displays the employee's own profile, salary history, attendance,
 * loans, and provides access to payslip generation.
 * Maps the authenticated user to their employee record automatically.
 */
export function EmployeeDashboardPage() {
  const [payslipMonth, setPayslipMonth] = useState('');

  // Fetch own profile via self-service mapping
  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ['self-service-profile'],
    queryFn: async () => {
      try {
        const response = await selfServiceAPI.getProfile();
        return response.data;
      } catch {
        return null;
      }
    },
  });

  // Fetch own salary history
  const { data: salaryData } = useQuery({
    queryKey: ['self-service-salary'],
    queryFn: async () => {
      try {
        const response = await selfServiceAPI.getSalaryHistory();
        return response.data;
      } catch {
        return [];
      }
    },
    enabled: !!profileData,
  });

  // Fetch own loans
  const { data: loansData } = useQuery({
    queryKey: ['self-service-loans'],
    queryFn: async () => {
      try {
        const response = await selfServiceAPI.getLoans();
        return response.data;
      } catch {
        return [];
      }
    },
    enabled: !!profileData,
  });

  // Fetch own attendance (last 30 days)
  const { data: attendanceData } = useQuery({
    queryKey: ['self-service-attendance'],
    queryFn: async () => {
      try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const response = await selfServiceAPI.getAttendance({
          from: thirtyDaysAgo.toISOString().substring(0, 10),
        });
        return response.data;
      } catch {
        return [];
      }
    },
    enabled: !!profileData,
  });

  const openPayslip = () => {
    if (!payslipMonth) return;
    const url = selfServiceAPI.getPayslipUrl(payslipMonth);
    const token = localStorage.getItem('token');
    window.open(`${url}&token=${encodeURIComponent(token || '')}`, '_blank');
  };

  if (profileLoading) {
    return (
      <MainLayout title="Employee Dashboard" description="Loading...">
        <div className="flex justify-center py-20 text-muted-foreground">Loading your profile...</div>
      </MainLayout>
    );
  }

  if (!profileData) {
    return (
      <MainLayout title="Employee Dashboard" description="Self-service portal">
        <Card>
          <CardHeader>
            <CardTitle>Account Not Linked</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>Your user account is not yet linked to an employee record.</p>
            <p className="mt-2">Please contact your administrator to link your account to your employee profile.</p>
          </CardContent>
        </Card>
      </MainLayout>
    );
  }

  const salaryHistory = salaryData || [];
  const loans = loansData || [];
  const attendance = attendanceData || [];
  const presentCount = attendance.filter((a: any) => a.status === 'PRESENT').length;
  const absentCount = attendance.filter((a: any) => a.status === 'ABSENT').length;

  return (
    <MainLayout title="Employee Dashboard" description="Your payroll and attendance portal">
      <div className="space-y-6">
        {/* Profile Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-accent" />
              My Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Employee ID:</span>
                <p className="font-medium">{profileData.employeeCode}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Name:</span>
                <p className="font-medium">{profileData.fullName}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Department:</span>
                <p className="font-medium">{profileData.departmentName || 'N/A'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Role:</span>
                <p className="font-medium">{profileData.roleName || 'N/A'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Salary Type:</span>
                <p className="font-medium">{profileData.salaryType}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Email:</span>
                <p className="font-medium">{profileData.email || 'N/A'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payslip Generation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-accent" />
              My Payslip
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-sm font-medium text-gray-700">Month</label>
                <Input
                  type="month"
                  value={payslipMonth}
                  onChange={(e) => setPayslipMonth(e.target.value)}
                />
              </div>
              <Button onClick={openPayslip} disabled={!payslipMonth}>
                <Printer className="h-4 w-4 mr-2" />
                View / Print Payslip
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Attendance Summary (last 30 days) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-accent" />
              Recent Attendance (Last 30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-6 mb-4 text-sm">
              <span className="text-green-600 font-medium">Present: {presentCount}</span>
              <span className="text-red-600 font-medium">Absent: {absentCount}</span>
              <span className="text-muted-foreground">Total records: {attendance.length}</span>
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
                {attendance.slice(0, 10).map((row: any) => (
                  <TableRow key={row.id}>
                    <TableCell>{new Date(row.date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge className={row.status === 'PRESENT' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                        {row.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{row.notes || '-'}</TableCell>
                  </TableRow>
                ))}
                {attendance.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                      No attendance records found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Salary History */}
        <Card>
          <CardHeader>
            <CardTitle>My Salary History</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Gross</TableHead>
                  <TableHead className="text-right">Deductions</TableHead>
                  <TableHead className="text-right">Net Salary</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salaryHistory.slice(0, 12).map((row: any) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      {new Date(row.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(row.gross)}</TableCell>
                    <TableCell className="text-right font-mono text-red-600">
                      {formatCurrency(row.advanceDeductions + row.loanDeductions)}
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium">{formatCurrency(row.totalSalary)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{row.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {salaryHistory.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                      No salary records found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Loans */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-accent" />
              My Loans
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">Loan Amount</TableHead>
                  <TableHead className="text-right">Remaining</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loans.map((loan: any) => (
                  <TableRow key={loan.id}>
                    <TableCell className="text-right font-mono">{formatCurrency(loan.loanAmount)}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(loan.remainingBalance)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{loan.repaymentMode}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={loan.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}>
                        {loan.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {loans.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                      No loans found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
