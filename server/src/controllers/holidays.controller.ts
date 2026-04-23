import { Response } from 'express';
import { execute, generateId, query, queryOne } from '../utils/db';
import { AuthRequest } from '../types';
import { writeAuditLog, AuditAction } from '../utils/auditLog';

/**
 * Holiday scope constants.
 * GLOBAL: applies to all employees.
 * PER_EMPLOYEE: only applies to specifically assigned employees.
 */
const SCOPE_GLOBAL = 'GLOBAL';
const SCOPE_PER_EMPLOYEE = 'PER_EMPLOYEE';

/**
 * Retrieves all holidays, optionally filtered by date range.
 * For each holiday, includes the count and list of assigned employees
 * when scope is PER_EMPLOYEE.
 *
 * GET /api/holidays?from=YYYY-MM-DD&to=YYYY-MM-DD
 * @param req - Express request with optional from/to query params
 * @param res - Express response
 * @returns { data: Holiday[] }
 */
// PUBLIC_INTERFACE
export const getHolidays = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { from, to } = req.query as Record<string, string | undefined>;
    let sql = `SELECT h.id, h.date, h.name, h.type, h.scope,
                      h.created_at as createdAt, h.updated_at as updatedAt
               FROM holidays h WHERE 1=1`;
    const params: unknown[] = [];
    if (from) {
      sql += ' AND h.date >= ?';
      params.push(from);
    }
    if (to) {
      sql += ' AND h.date <= ?';
      params.push(to);
    }
    sql += ' ORDER BY h.date ASC';

    const holidays = await query<any>(sql, params);

    // Fetch assigned employees for PER_EMPLOYEE holidays
    const perEmployeeIds = holidays
      .filter((h: any) => h.scope === SCOPE_PER_EMPLOYEE)
      .map((h: any) => h.id);

    let assignmentMap: Record<string, Array<{ employeeId: string; employeeName: string; employeeCode: string }>> = {};

    if (perEmployeeIds.length > 0) {
      const placeholders = perEmployeeIds.map(() => '?').join(',');
      const assignments = await query<any>(
        `SELECT he.holiday_id AS holidayId, he.employee_id AS employeeId,
                e.full_name AS employeeName, e.employee_id AS employeeCode
         FROM holiday_employees he
         INNER JOIN employees e ON e.id = he.employee_id
         WHERE he.holiday_id IN (${placeholders})
         ORDER BY e.full_name ASC`,
        perEmployeeIds
      );

      for (const a of assignments) {
        if (!assignmentMap[a.holidayId]) {
          assignmentMap[a.holidayId] = [];
        }
        assignmentMap[a.holidayId].push({
          employeeId: a.employeeId,
          employeeName: a.employeeName,
          employeeCode: a.employeeCode,
        });
      }
    }

    const data = holidays.map((h: any) => ({
      ...h,
      assignedEmployees: assignmentMap[h.id] || [],
      assignedEmployeeCount: (assignmentMap[h.id] || []).length,
    }));

    res.json({ data });
  } catch (error: any) {
    console.error('getHolidays error:', error);
    res.status(500).json({ error: 'Failed to fetch holidays' });
  }
};

/**
 * Retrieves a single holiday by ID, including assigned employees.
 *
 * GET /api/holidays/:id
 * @param req - Express request with id param
 * @param res - Express response
 * @returns { data: Holiday }
 */
// PUBLIC_INTERFACE
export const getHoliday = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const row = await queryOne<any>(
      `SELECT id, date, name, type, scope,
              created_at as createdAt, updated_at as updatedAt
       FROM holidays WHERE id = ?`,
      [req.params.id]
    );
    if (!row) {
      res.status(404).json({ error: 'Holiday not found' });
      return;
    }

    // Fetch assigned employees
    const assignments = await query<any>(
      `SELECT he.employee_id AS employeeId,
              e.full_name AS employeeName, e.employee_id AS employeeCode
       FROM holiday_employees he
       INNER JOIN employees e ON e.id = he.employee_id
       WHERE he.holiday_id = ?
       ORDER BY e.full_name ASC`,
      [row.id]
    );

    res.json({
      data: {
        ...row,
        assignedEmployees: assignments,
        assignedEmployeeCount: assignments.length,
      },
    });
  } catch (error: any) {
    console.error('getHoliday error:', error);
    res.status(500).json({ error: 'Failed to fetch holiday' });
  }
};

/**
 * Creates a new holiday. If scope is PER_EMPLOYEE, also assigns
 * the specified employees to the holiday.
 * Logs the action with actor role attribution (ADMIN vs MANAGER).
 *
 * POST /api/holidays
 * Body: { date, name, type, scope?, employeeIds?: string[] }
 * @param req - Express request with holiday data in body
 * @param res - Express response
 * @returns { data: { id } }
 */
// PUBLIC_INTERFACE
export const createHoliday = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { date, name, type, scope, employeeIds } = req.body as {
      date?: string;
      name?: string;
      type?: string;
      scope?: string;
      employeeIds?: string[];
    };

    if (!date || !name || !type) {
      res.status(400).json({ error: 'date, name and type are required' });
      return;
    }

    // Validate type
    if (!['PAID', 'UNPAID'].includes(type)) {
      res.status(400).json({ error: 'type must be PAID or UNPAID' });
      return;
    }

    const holidayScope = scope || SCOPE_GLOBAL;

    // Validate scope
    if (![SCOPE_GLOBAL, SCOPE_PER_EMPLOYEE].includes(holidayScope)) {
      res.status(400).json({ error: 'scope must be GLOBAL or PER_EMPLOYEE' });
      return;
    }

    // PER_EMPLOYEE scope requires at least one employee
    if (holidayScope === SCOPE_PER_EMPLOYEE && (!employeeIds || employeeIds.length === 0)) {
      res.status(400).json({ error: 'At least one employeeId is required for PER_EMPLOYEE scope' });
      return;
    }

    const id = generateId();
    await execute(
      `INSERT INTO holidays (id, date, name, type, scope, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
      [id, date, name, type, holidayScope]
    );

    // Assign employees if PER_EMPLOYEE scope
    if (holidayScope === SCOPE_PER_EMPLOYEE && employeeIds && employeeIds.length > 0) {
      await assignEmployeesToHoliday(id, employeeIds);
    }

    // Audit log with actor role attribution
    await writeAuditLog({
      tableName: 'holidays',
      action: AuditAction.CREATE,
      changedBy: req.user?.id,
      actorRole: req.user?.role,
      recordId: id,
      newData: { date, name, type, scope: holidayScope, employeeIds: employeeIds || [] },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      description: `Holiday "${name}" created for ${date} (${holidayScope})`,
    }).catch((err) => console.error('Audit log write failed (createHoliday):', err));

    res.status(201).json({ data: { id } });
  } catch (error: any) {
    console.error('createHoliday error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(409).json({ error: 'A holiday already exists for this date' });
      return;
    }
    res.status(500).json({ error: 'Failed to create holiday' });
  }
};

/**
 * Updates an existing holiday. If scope changes to PER_EMPLOYEE,
 * reassigns employees. If scope changes to GLOBAL, removes all assignments.
 * Logs the action with actor role attribution (ADMIN vs MANAGER).
 *
 * PUT /api/holidays/:id
 * Body: { date?, name?, type?, scope?, employeeIds?: string[] }
 * @param req - Express request with id param and holiday data in body
 * @param res - Express response
 * @returns { message: string }
 */
// PUBLIC_INTERFACE
export const updateHoliday = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const existing = await queryOne<any>(
      'SELECT * FROM holidays WHERE id = ?',
      [req.params.id]
    );
    if (!existing) {
      res.status(404).json({ error: 'Holiday not found' });
      return;
    }

    const { date, name, type, scope, employeeIds } = req.body as {
      date?: string;
      name?: string;
      type?: string;
      scope?: string;
      employeeIds?: string[];
    };

    // Validate type if provided
    if (type && !['PAID', 'UNPAID'].includes(type)) {
      res.status(400).json({ error: 'type must be PAID or UNPAID' });
      return;
    }

    // Validate scope if provided
    if (scope && ![SCOPE_GLOBAL, SCOPE_PER_EMPLOYEE].includes(scope)) {
      res.status(400).json({ error: 'scope must be GLOBAL or PER_EMPLOYEE' });
      return;
    }

    const newScope = scope || existing.scope;

    // PER_EMPLOYEE requires employees
    if (newScope === SCOPE_PER_EMPLOYEE && employeeIds !== undefined && employeeIds.length === 0) {
      res.status(400).json({ error: 'At least one employeeId is required for PER_EMPLOYEE scope' });
      return;
    }

    await execute(
      `UPDATE holidays
       SET date = COALESCE(?, date),
           name = COALESCE(?, name),
           type = COALESCE(?, type),
           scope = COALESCE(?, scope),
           updated_at = NOW()
       WHERE id = ?`,
      [date || null, name || null, type || null, scope || null, req.params.id]
    );

    // Handle employee assignments based on scope change
    if (newScope === SCOPE_GLOBAL) {
      // Remove all employee assignments if scope changed to GLOBAL
      await execute('DELETE FROM holiday_employees WHERE holiday_id = ?', [req.params.id]);
    } else if (newScope === SCOPE_PER_EMPLOYEE && employeeIds !== undefined) {
      // Replace all assignments
      await execute('DELETE FROM holiday_employees WHERE holiday_id = ?', [req.params.id]);
      if (employeeIds.length > 0) {
        await assignEmployeesToHoliday(req.params.id, employeeIds);
      }
    }

    // Audit log with actor role attribution and before/after data
    await writeAuditLog({
      tableName: 'holidays',
      action: AuditAction.UPDATE,
      changedBy: req.user?.id,
      actorRole: req.user?.role,
      recordId: req.params.id,
      previousData: { date: existing.date, name: existing.name, type: existing.type, scope: existing.scope },
      newData: { date, name, type, scope, employeeIds },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      description: `Holiday "${existing.name}" updated`,
    }).catch((err) => console.error('Audit log write failed (updateHoliday):', err));

    res.json({ message: 'Holiday updated' });
  } catch (error: any) {
    console.error('updateHoliday error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(409).json({ error: 'A holiday already exists for this date' });
      return;
    }
    res.status(500).json({ error: 'Failed to update holiday' });
  }
};

/**
 * Deletes a holiday and its employee assignments (via CASCADE).
 * Logs the action with actor role attribution (ADMIN vs MANAGER).
 *
 * DELETE /api/holidays/:id
 * @param req - Express request with id param
 * @param res - Express response
 * @returns { message: string }
 */
// PUBLIC_INTERFACE
export const deleteHoliday = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Fetch existing holiday for audit trail before deletion
    const existing = await queryOne<any>(
      'SELECT * FROM holidays WHERE id = ?',
      [req.params.id]
    );

    await execute('DELETE FROM holidays WHERE id = ?', [req.params.id]);

    // Audit log with actor role attribution
    if (existing) {
      await writeAuditLog({
        tableName: 'holidays',
        action: AuditAction.DELETE,
        changedBy: req.user?.id,
        actorRole: req.user?.role,
        recordId: req.params.id,
        previousData: { date: existing.date, name: existing.name, type: existing.type, scope: existing.scope },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        description: `Holiday "${existing.name}" (${existing.date}) deleted`,
      }).catch((err) => console.error('Audit log write failed (deleteHoliday):', err));
    }

    res.json({ message: 'Holiday deleted' });
  } catch (error: any) {
    console.error('deleteHoliday error:', error);
    res.status(500).json({ error: 'Failed to delete holiday' });
  }
};

/**
 * Updates the employee assignments for a PER_EMPLOYEE holiday.
 * Replaces all current assignments with the provided list.
 * Logs the action with actor role attribution (ADMIN vs MANAGER).
 *
 * PUT /api/holidays/:id/employees
 * Body: { employeeIds: string[] }
 * @param req - Express request with id param and employeeIds in body
 * @param res - Express response
 * @returns { message: string, assignedCount: number }
 */
// PUBLIC_INTERFACE
export const updateHolidayEmployees = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const existing = await queryOne<{ id: string; scope: string; name: string }>(
      'SELECT id, scope, name FROM holidays WHERE id = ?',
      [req.params.id]
    );
    if (!existing) {
      res.status(404).json({ error: 'Holiday not found' });
      return;
    }

    if (existing.scope !== SCOPE_PER_EMPLOYEE) {
      res.status(400).json({
        error: 'Employee assignments can only be modified for PER_EMPLOYEE scope holidays',
      });
      return;
    }

    const { employeeIds } = req.body as { employeeIds?: string[] };
    if (!employeeIds || employeeIds.length === 0) {
      res.status(400).json({ error: 'At least one employeeId is required' });
      return;
    }

    // Fetch previous assignments for audit trail
    const previousAssignments = await query<any>(
      `SELECT employee_id FROM holiday_employees WHERE holiday_id = ?`,
      [req.params.id]
    );
    const previousEmployeeIds = previousAssignments.map((a: any) => a.employee_id);

    // Replace all assignments
    await execute('DELETE FROM holiday_employees WHERE holiday_id = ?', [req.params.id]);
    await assignEmployeesToHoliday(req.params.id, employeeIds);

    // Audit log with actor role attribution
    await writeAuditLog({
      tableName: 'holiday_employees',
      action: AuditAction.UPDATE,
      changedBy: req.user?.id,
      actorRole: req.user?.role,
      recordId: req.params.id,
      previousData: { employeeIds: previousEmployeeIds },
      newData: { employeeIds },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      description: `Holiday "${existing.name}" employee assignments updated (${employeeIds.length} employees)`,
    }).catch((err) => console.error('Audit log write failed (updateHolidayEmployees):', err));

    res.json({ message: 'Holiday employees updated', assignedCount: employeeIds.length });
  } catch (error: any) {
    console.error('updateHolidayEmployees error:', error);
    res.status(500).json({ error: 'Failed to update holiday employees' });
  }
};

/**
 * Returns all holidays applicable to a specific employee in a date range.
 * Includes GLOBAL holidays + PER_EMPLOYEE holidays where the employee is assigned.
 *
 * GET /api/holidays/employee/:employeeId?from=YYYY-MM-DD&to=YYYY-MM-DD
 * @param req - Express request with employeeId param and optional from/to query
 * @param res - Express response
 * @returns { data: Holiday[] }
 */
// PUBLIC_INTERFACE
export const getEmployeeHolidays = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { employeeId } = req.params;
    const { from, to } = req.query as { from?: string; to?: string };

    let sql = `SELECT DISTINCT h.id, h.date, h.name, h.type, h.scope,
                      h.created_at as createdAt, h.updated_at as updatedAt
               FROM holidays h
               LEFT JOIN holiday_employees he ON he.holiday_id = h.id
               WHERE (h.scope = 'GLOBAL' OR (h.scope = 'PER_EMPLOYEE' AND he.employee_id = ?))`;
    const params: unknown[] = [employeeId];

    if (from) {
      sql += ' AND h.date >= ?';
      params.push(from);
    }
    if (to) {
      sql += ' AND h.date <= ?';
      params.push(to);
    }
    sql += ' ORDER BY h.date ASC';

    const holidays = await query<any>(sql, params);
    res.json({ data: holidays });
  } catch (error: any) {
    console.error('getEmployeeHolidays error:', error);
    res.status(500).json({ error: 'Failed to fetch employee holidays' });
  }
};

/**
 * Counts holidays applicable to a specific employee within a date range.
 * Used by salary calculation to determine working days.
 * Only PAID holidays count towards paid days off.
 *
 * @param employeeId - The employee ID
 * @param from - Start date (YYYY-MM-DD)
 * @param to - End date (YYYY-MM-DD)
 * @param type - Optional holiday type filter ('PAID' | 'UNPAID')
 * @returns Number of applicable holidays in the range
 */
// PUBLIC_INTERFACE
export async function countEmployeeHolidays(
  employeeId: string,
  from: string,
  to: string,
  type?: 'PAID' | 'UNPAID'
): Promise<number> {
  let sql = `SELECT COUNT(DISTINCT h.id) AS cnt
             FROM holidays h
             LEFT JOIN holiday_employees he ON he.holiday_id = h.id
             WHERE (h.scope = 'GLOBAL' OR (h.scope = 'PER_EMPLOYEE' AND he.employee_id = ?))
               AND h.date >= ? AND h.date <= ?`;
  const params: unknown[] = [employeeId, from, to];

  if (type) {
    sql += ' AND h.type = ?';
    params.push(type);
  }

  const row = await queryOne<{ cnt: number }>(sql, params);
  return Number(row?.cnt || 0);
}

/**
 * Checks if a specific date is a holiday for a given employee.
 * Returns the holiday record if found, null otherwise.
 *
 * @param employeeId - The employee ID
 * @param date - The date to check (YYYY-MM-DD)
 * @returns Holiday record or null
 */
// PUBLIC_INTERFACE
export async function isHolidayForEmployee(
  employeeId: string,
  date: string
): Promise<{ id: string; name: string; type: string; scope: string } | null> {
  const row = await queryOne<any>(
    `SELECT DISTINCT h.id, h.name, h.type, h.scope
     FROM holidays h
     LEFT JOIN holiday_employees he ON he.holiday_id = h.id
     WHERE (h.scope = 'GLOBAL' OR (h.scope = 'PER_EMPLOYEE' AND he.employee_id = ?))
       AND h.date = ?
     LIMIT 1`,
    [employeeId, date]
  );
  return row || null;
}

/**
 * Internal helper: assigns multiple employees to a holiday.
 * Inserts records into the holiday_employees junction table.
 *
 * @param holidayId - The holiday ID
 * @param employeeIds - Array of employee IDs to assign
 */
async function assignEmployeesToHoliday(holidayId: string, employeeIds: string[]): Promise<void> {
  for (const empId of employeeIds) {
    const id = generateId();
    try {
      await execute(
        `INSERT INTO holiday_employees (id, holiday_id, employee_id, created_at)
         VALUES (?, ?, ?, NOW())`,
        [id, holidayId, empId]
      );
    } catch (err: any) {
      // Skip duplicates silently
      if (err.code !== 'ER_DUP_ENTRY') {
        throw err;
      }
    }
  }
}
