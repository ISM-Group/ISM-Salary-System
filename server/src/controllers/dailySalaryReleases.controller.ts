import { Response } from 'express';
import { query } from '../utils/db';
import { AuthRequest } from '../types';

export const getDailySalaryReleases = async (req: AuthRequest, res: Response): Promise<void> => {
  const date = (req.query.date as string | undefined) || new Date().toISOString().slice(0, 10);
  const rows = await query<any>(
    `SELECT sc.id, sc.employee_id as employeeId, e.full_name as employeeName,
            sc.total_salary as totalSalary, sc.status, sc.month
     FROM salary_calculations sc
     INNER JOIN employees e ON e.id = sc.employee_id
     WHERE DATE(sc.created_at) = ?
     ORDER BY e.full_name ASC`,
    [date]
  );

  res.json({
    data: rows.map((row) => ({
      ...row,
      totalSalary: Number(row.totalSalary || 0),
    })),
  });
};
