import { FormEvent, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { employeesAPI, salaryAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';

export function SalaryCalculatePage() {
  const [employeeId, setEmployeeId] = useState('');
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7) + '-01');
  const [bonus, setBonus] = useState('0');
  const [advanceDeductions, setAdvanceDeductions] = useState('0');
  const [loanDeductions, setLoanDeductions] = useState('0');
  const [result, setResult] = useState<any>(null);

  const { data: employeesData } = useQuery({
    queryKey: ['employees-for-salary-calc'],
    queryFn: async () => {
      const response = await employeesAPI.getAll({ isActive: true });
      return response.data;
    },
  });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const response = await salaryAPI.calculate({
      employeeId,
      month,
      bonus: Number(bonus),
      advanceDeductions: Number(advanceDeductions),
      loanDeductions: Number(loanDeductions),
    });
    setResult(response.data);
  };

  return (
    <MainLayout title="Salary Calculation" description="Run monthly salary calculations">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Calculate Salary</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 md:grid-cols-3" onSubmit={submit}>
              <select
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
              <Input type="date" value={month} onChange={(e) => setMonth(e.target.value)} required />
              <Input type="number" value={bonus} onChange={(e) => setBonus(e.target.value)} placeholder="Bonus" />
              <Input
                type="number"
                value={advanceDeductions}
                onChange={(e) => setAdvanceDeductions(e.target.value)}
                placeholder="Advance deductions"
              />
              <Input
                type="number"
                value={loanDeductions}
                onChange={(e) => setLoanDeductions(e.target.value)}
                placeholder="Loan deductions"
              />
              <Button type="submit">Calculate</Button>
            </form>
          </CardContent>
        </Card>

        {result && (
          <Card>
            <CardHeader>
              <CardTitle>Calculation Result</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>Gross: {formatCurrency(result.gross)}</p>
              <p>Total: {formatCurrency(result.total)}</p>
              <p>Present Days: {result.attendance.presentDays}</p>
              <p>Half Days: {result.attendance.halfDays}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
