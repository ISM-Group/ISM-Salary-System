import { FormEvent, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { employeesAPI, salaryAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { Calculator, AlertCircle } from 'lucide-react';

/**
 * SalaryCalculatePage — Run monthly salary calculations for employees.
 *
 * The server auto-calculates deductions:
 * - Advance deductions: only APPROVED advances for the month
 * - Loan deductions: MONTHLY installments + DAILY loan deductions from daily releases
 *   (DAILY loan deductions skip ABSENT days because releases are only generated for PRESENT days)
 *
 * The client sends only employeeId, month, and optional bonus.
 * Negative salary totals are allowed per business rules.
 */
// PUBLIC_INTERFACE
export function SalaryCalculatePage() {
  const [employeeId, setEmployeeId] = useState('');
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7) + '-01');
  const [bonus, setBonus] = useState('0');
  const [result, setResult] = useState<any>(null);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: employeesData } = useQuery({
    queryKey: ['employees-for-salary-calc'],
    queryFn: async () => {
      const response = await employeesAPI.getAll({ isActive: true });
      return response.data;
    },
  });

  /**
   * Submits the salary calculation request.
   * Only sends employeeId, month, and bonus — deductions are auto-calculated server-side.
   */
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setCalculating(true);
    setError(null);
    setResult(null);
    try {
      const response = await salaryAPI.calculate({
        employeeId,
        month,
        bonus: Number(bonus),
      });
      setResult(response.data);
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to calculate salary.';
      setError(msg);
    } finally {
      setCalculating(false);
    }
  };

  return (
    <MainLayout title="Salary Calculation" description="Run monthly salary calculations with auto-calculated deductions">
      <div className="space-y-6">
        {/* Calculation Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Calculate Salary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={submit}>
              <div className="grid gap-4 md:grid-cols-3">
                {/* Employee Selection */}
                <div className="flex flex-col gap-1">
                  <label htmlFor="salary-employee" className="text-sm font-medium text-gray-700">
                    Employee
                  </label>
                  <select
                    id="salary-employee"
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    required
                  >
                    <option value="">Select employee</option>
                    {(employeesData || []).map((e: any) => (
                      <option key={e.id} value={e.id}>
                        {e.fullName} ({e.employeeId})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Month Selection */}
                <div className="flex flex-col gap-1">
                  <label htmlFor="salary-month" className="text-sm font-medium text-gray-700">
                    Month
                  </label>
                  <Input
                    id="salary-month"
                    type="date"
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    required
                  />
                </div>

                {/* Bonus */}
                <div className="flex flex-col gap-1">
                  <label htmlFor="salary-bonus" className="text-sm font-medium text-gray-700">
                    Bonus
                  </label>
                  <Input
                    id="salary-bonus"
                    type="number"
                    min="0"
                    step="0.01"
                    value={bonus}
                    onChange={(e) => setBonus(e.target.value)}
                    placeholder="Bonus amount"
                  />
                </div>
              </div>

              <p className="text-xs text-gray-500">
                Advance and loan deductions are auto-calculated from the database.
                Only APPROVED advances are deducted. Daily loan deductions skip ABSENT days.
              </p>

              <Button type="submit" disabled={calculating} className="bg-blue-600 hover:bg-blue-700 text-white">
                {calculating ? 'Calculating...' : 'Calculate'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 rounded-lg p-3 text-sm bg-red-50 text-red-800 border border-red-200">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {/* Calculation Result */}
        {result && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Calculation Result
                <Badge
                  variant="outline"
                  className={
                    result.salaryType === 'FIXED'
                      ? 'bg-purple-50 text-purple-700 border-purple-300 ml-2'
                      : 'bg-blue-50 text-blue-700 border-blue-300 ml-2'
                  }
                >
                  {result.salaryType === 'FIXED' ? 'Fixed Salary' : 'Daily Wage'}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {/* Earnings */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase">Earnings</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Gross Salary</span>
                      <span className="font-mono font-semibold text-gray-900">
                        {formatCurrency(result.gross)}
                      </span>
                    </div>
                    {Number(bonus) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Bonus</span>
                        <span className="font-mono text-green-700">
                          +{formatCurrency(Number(bonus))}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Deductions */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase">Deductions</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Absent Deduction ({result.attendance.absentDays} days)</span>
                      <span className="font-mono text-red-600">
                        -{formatCurrency(result.absentDeduction)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Advance Deductions (auto)</span>
                      <span className="font-mono text-red-600">
                        -{formatCurrency(result.advanceDeductions || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Loan Deductions (auto)</span>
                      <span className="font-mono text-red-600">
                        -{formatCurrency(result.loanDeductions || 0)}
                      </span>
                    </div>
                    {/* Loan deduction breakdown */}
                    {(result.monthlyLoanDeductions > 0 || result.dailyLoanDeductions > 0) && (
                      <div className="ml-4 text-xs text-gray-500 space-y-1">
                        {result.monthlyLoanDeductions > 0 && (
                          <div className="flex justify-between">
                            <span>Monthly installments</span>
                            <span className="font-mono">{formatCurrency(result.monthlyLoanDeductions)}</span>
                          </div>
                        )}
                        {result.dailyLoanDeductions > 0 && (
                          <div className="flex justify-between">
                            <span>Daily deductions (PRESENT days only)</span>
                            <span className="font-mono">{formatCurrency(result.dailyLoanDeductions)}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Total */}
              <div className="mt-6 border-t pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-900">Total Salary</span>
                  <span
                    className={`text-xl font-bold font-mono ${
                      result.total < 0 ? 'text-red-600' : 'text-green-700'
                    }`}
                  >
                    {formatCurrency(result.total)}
                  </span>
                </div>
                {result.total < 0 && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-red-600">
                    <AlertCircle className="h-3 w-3" />
                    Negative salary: deductions exceed earnings for this period.
                  </div>
                )}
              </div>

              {/* Attendance & Working Days Summary */}
              <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-5">
                <div className="rounded-lg bg-gray-50 p-3 text-center">
                  <p className="text-xs text-gray-500">Calendar Days</p>
                  <p className="text-lg font-bold text-gray-900">{result.calendarDays}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3 text-center">
                  <p className="text-xs text-gray-500">Working Days</p>
                  <p className="text-lg font-bold text-gray-900">{result.workingDays}</p>
                </div>
                <div className="rounded-lg bg-green-50 p-3 text-center">
                  <p className="text-xs text-gray-500">Present</p>
                  <p className="text-lg font-bold text-green-700">{result.attendance.presentDays}</p>
                </div>
                <div className="rounded-lg bg-red-50 p-3 text-center">
                  <p className="text-xs text-gray-500">Absent</p>
                  <p className="text-lg font-bold text-red-700">{result.attendance.absentDays}</p>
                </div>
                <div className="rounded-lg bg-blue-50 p-3 text-center">
                  <p className="text-xs text-gray-500">Paid Holidays</p>
                  <p className="text-lg font-bold text-blue-700">{result.paidHolidayCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
