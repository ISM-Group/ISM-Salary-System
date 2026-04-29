import { Response } from 'express';
import { execute, generateId, queryOne } from '../utils/db';
import { AuthRequest } from '../types';

/** GET /api/department-rules/:departmentId */
export const getDepartmentRules = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { departmentId } = req.params;
    const row = await queryOne<any>(
      'SELECT paid_leave_days, full_attendance_bonus_days FROM department_rules WHERE department_id = ?',
      [departmentId]
    );
    res.json({
      data: {
        paidLeaveDays: row ? Number(row.paid_leave_days) : 0,
        fullAttendanceBonusDays: row ? Number(row.full_attendance_bonus_days) : 0,
      },
    });
  } catch (err: any) {
    console.error('getDepartmentRules error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/** PUT /api/department-rules/:departmentId */
export const upsertDepartmentRules = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { departmentId } = req.params;
    const { paidLeaveDays, fullAttendanceBonusDays } = req.body as { paidLeaveDays: number; fullAttendanceBonusDays: number };

    const existing = await queryOne<{ id: string }>(
      'SELECT id FROM department_rules WHERE department_id = ?',
      [departmentId]
    );

    if (existing) {
      await execute(
        'UPDATE department_rules SET paid_leave_days = ?, full_attendance_bonus_days = ?, updated_at = NOW() WHERE department_id = ?',
        [paidLeaveDays, fullAttendanceBonusDays, departmentId]
      );
    } else {
      await execute(
        'INSERT INTO department_rules (id, department_id, paid_leave_days, full_attendance_bonus_days) VALUES (?, ?, ?, ?)',
        [generateId(), departmentId, paidLeaveDays, fullAttendanceBonusDays]
      );
    }

    res.json({ data: { paidLeaveDays, fullAttendanceBonusDays } });
  } catch (err: any) {
    console.error('upsertDepartmentRules error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/** DELETE /api/department-rules/:departmentId */
export const deleteDepartmentRules = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await execute('DELETE FROM department_rules WHERE department_id = ?', [req.params.departmentId]);
    res.json({ message: 'Rules cleared' });
  } catch (err: any) {
    console.error('deleteDepartmentRules error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
