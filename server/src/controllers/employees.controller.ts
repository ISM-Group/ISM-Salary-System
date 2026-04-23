import { Response } from 'express';
import { execute, generateId, query, queryOne } from '../utils/db';
import { AuthRequest } from '../types';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';

/**
 * GET /employees
 * Returns the list of employees, optionally filtered by department, active status, or search term.
 * Supports server-side pagination via ?page=&limit= query parameters.
 * When no isActive filter is provided, defaults to returning only active employees (is_active = true).
 */
// PUBLIC_INTERFACE
export const getEmployees = async (req: AuthRequest, res: Response): Promise<void> => {
  const { departmentId, isActive, search } = req.query as {
    departmentId?: string;
    isActive?: string;
    search?: string;
  };

  const pagination = parsePagination(req.query as Record<string, unknown>);

  const selectFields = `
      e.id,
      e.employee_id as employeeId,
      e.full_name as fullName,
      e.email,
      e.phone,
      e.salary_type as salaryType,
      e.base_salary as baseSalary,
      e.hire_date as hireDate,
      e.is_active as isActive,
      e.address_line1 as addressLine1,
      e.address_line2 as addressLine2,
      e.city,
      e.region,
      d.id as departmentId,
      d.name as departmentName,
      r.id as roleId,
      r.name as roleName,
      r.daily_wage as roleDailyWage
  `;

  const fromClause = `
    FROM employees e
    LEFT JOIN departments d ON d.id = e.department_id
    LEFT JOIN roles r ON r.id = e.role_id
  `;

  let whereClause = ' WHERE 1=1';
  const params: unknown[] = [];

  if (departmentId) {
    whereClause += ' AND e.department_id = ?';
    params.push(departmentId);
  }

  // Default to active employees when no explicit isActive filter is provided.
  if (isActive === 'true' || isActive === 'false') {
    whereClause += ' AND e.is_active = ?';
    params.push(isActive === 'true');
  } else {
    // Default: show only active employees
    whereClause += ' AND e.is_active = ?';
    params.push(true);
  }

  if (search) {
    whereClause += ' AND (e.full_name LIKE ? OR e.employee_id LIKE ? OR e.email LIKE ? OR e.phone LIKE ?)';
    const q = `%${search}%`;
    params.push(q, q, q, q);
  }

  // Count total for pagination
  const countResult = await queryOne<{ total: number }>(`SELECT COUNT(*) AS total ${fromClause} ${whereClause}`, params);
  const total = Number(countResult?.total || 0);

  // Fetch paginated data
  const dataSql = `SELECT ${selectFields} ${fromClause} ${whereClause} ORDER BY e.full_name ASC LIMIT ? OFFSET ?`;
  const rows = await query<any>(dataSql, [...params, pagination.limit, pagination.offset]);

  res.json({
    data: rows.map((row) => ({
      id: row.id,
      employeeId: row.employeeId,
      fullName: row.fullName,
      email: row.email,
      phone: row.phone,
      salaryType: row.salaryType,
      baseSalary: row.baseSalary ? Number(row.baseSalary) : null,
      hireDate: row.hireDate,
      isActive: !!row.isActive,
      address: {
        line1: row.addressLine1,
        line2: row.addressLine2,
        city: row.city,
        region: row.region,
      },
      department: row.departmentId ? { id: row.departmentId, name: row.departmentName } : null,
      role: row.roleId
        ? { id: row.roleId, name: row.roleName, dailyWage: row.roleDailyWage ? Number(row.roleDailyWage) : null }
        : null,
    })),
    pagination: buildPaginationMeta(total, pagination),
  });
};

/**
 * GET /employees/:id
 * Returns a single employee by ID.
 */
// PUBLIC_INTERFACE
export const getEmployee = async (req: AuthRequest, res: Response): Promise<void> => {
  const result = await queryOne<any>(
    `SELECT
      e.id,
      e.employee_id as employeeId,
      e.full_name as fullName,
      e.email,
      e.phone,
      e.salary_type as salaryType,
      e.base_salary as baseSalary,
      e.hire_date as hireDate,
      e.is_active as isActive,
      e.address_line1 as addressLine1,
      e.address_line2 as addressLine2,
      e.city,
      e.region,
      d.id as departmentId,
      d.name as departmentName,
      r.id as roleId,
      r.name as roleName,
      r.daily_wage as roleDailyWage
    FROM employees e
    LEFT JOIN departments d ON d.id = e.department_id
    LEFT JOIN roles r ON r.id = e.role_id
    WHERE e.id = ?`,
    [req.params.id]
  );

  if (!result) {
    res.status(404).json({ error: 'Employee not found' });
    return;
  }

  res.json({
    data: {
      ...result,
      baseSalary: result.baseSalary ? Number(result.baseSalary) : null,
      isActive: !!result.isActive,
    },
  });
};

/**
 * POST /employees
 * Creates a new employee record.
 * Required fields: employeeId, fullName, departmentId, hireDate.
 */
// PUBLIC_INTERFACE
export const createEmployee = async (req: AuthRequest, res: Response): Promise<void> => {
  const {
    employeeId,
    fullName,
    email,
    phone,
    departmentId,
    roleId,
    hireDate,
    salaryType,
    baseSalary,
    isActive,
    addressLine1,
    addressLine2,
    city,
    region,
  } = req.body as Record<string, unknown>;

  if (!employeeId || !fullName || !departmentId || !hireDate) {
    res.status(400).json({ error: 'employeeId, fullName, departmentId and hireDate are required' });
    return;
  }

  const id = generateId();
  await execute(
    `INSERT INTO employees (
      id, employee_id, full_name, email, phone, department_id, role_id, hire_date,
      salary_type, base_salary, is_active, address_line1, address_line2, city, region, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [
      id,
      employeeId,
      fullName,
      email || null,
      phone || null,
      departmentId,
      roleId || null,
      hireDate,
      salaryType || 'DAILY_WAGE',
      baseSalary || null,
      isActive ?? true,
      addressLine1 || null,
      addressLine2 || null,
      city || null,
      region || null,
    ]
  );

  const created = await queryOne('SELECT id FROM employees WHERE id = ?', [id]);
  res.status(201).json({ data: created });
};

/**
 * PUT /employees/:id
 * Updates an employee record.
 *
 * FIX: Replaced COALESCE pattern with explicit field assignments.
 * The old COALESCE approach made it impossible to clear optional fields once set,
 * because COALESCE(NULL, current_value) always keeps the old value.
 * Now, only fields that are explicitly present in the request body are updated.
 * To clear an optional field, send it with an explicit null value in the payload.
 */
// PUBLIC_INTERFACE
export const updateEmployee = async (req: AuthRequest, res: Response): Promise<void> => {
  const existing = await queryOne<{ id: string }>('SELECT id FROM employees WHERE id = ?', [req.params.id]);
  if (!existing) {
    res.status(404).json({ error: 'Employee not found' });
    return;
  }

  const payload = req.body as Record<string, unknown>;

  // Map from payload key -> database column name
  const fieldMap: Record<string, string> = {
    employeeId: 'employee_id',
    fullName: 'full_name',
    email: 'email',
    phone: 'phone',
    departmentId: 'department_id',
    roleId: 'role_id',
    hireDate: 'hire_date',
    salaryType: 'salary_type',
    baseSalary: 'base_salary',
    isActive: 'is_active',
    addressLine1: 'address_line1',
    addressLine2: 'address_line2',
    city: 'city',
    region: 'region',
  };

  const setClauses: string[] = [];
  const params: unknown[] = [];

  for (const [payloadKey, column] of Object.entries(fieldMap)) {
    if (payloadKey in payload) {
      setClauses.push(`${column} = ?`);
      params.push(payload[payloadKey] ?? null);
    }
  }

  // If no updatable fields were provided, return early
  if (setClauses.length === 0) {
    res.status(400).json({ error: 'No updatable fields provided' });
    return;
  }

  // Always update the timestamp
  setClauses.push('updated_at = NOW()');
  params.push(req.params.id);

  await execute(
    `UPDATE employees SET ${setClauses.join(', ')} WHERE id = ?`,
    params
  );

  res.json({ message: 'Employee updated successfully' });
};

/**
 * GET /employees/:id/profile
 * Returns a comprehensive employee profile including salary history,
 * loans, advances, and attendance summary.
 */
// PUBLIC_INTERFACE
export const getEmployeeProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  const employee = await queryOne<any>(
    `SELECT
      e.id, e.employee_id as employeeId, e.full_name as fullName, e.email, e.phone, e.hire_date as hireDate,
      e.salary_type as salaryType, e.base_salary as baseSalary, e.is_active as isActive,
      e.address_line1, e.address_line2, e.city, e.region,
      d.id as department_id, d.name as department_name,
      r.id as role_id, r.name as role_name, r.daily_wage as role_daily_wage
    FROM employees e
    LEFT JOIN departments d ON d.id = e.department_id
    LEFT JOIN roles r ON r.id = e.role_id
    WHERE e.id = ?`,
    [req.params.id]
  );

  if (!employee) {
    res.status(404).json({ error: 'Employee not found' });
    return;
  }

  const salaryPromotions = await query<any>(
    `SELECT id, effective_from as effectiveFrom, salary_type as salaryType, base_salary as baseSalary,
            reason, notes, changed_at as changedAt
     FROM employee_salary_history
     WHERE employee_id = ?
     ORDER BY effective_from DESC`,
    [req.params.id]
  );

  const salaryHistory = await query<any>(
    `SELECT id, month, total_salary as totalSalary, bonus, advance_deductions as advanceDeductions,
            loan_deductions as loanDeductions, status, base_salary as baseSalary, daily_wage_total as dailyWageTotal
     FROM salary_calculations
     WHERE employee_id = ?
     ORDER BY month DESC
     LIMIT 12`,
    [req.params.id]
  );

  const loans = await query<any>(
    `SELECT id, loan_amount as loanAmount, remaining_balance as remainingBalance, status
     FROM loans WHERE employee_id = ? ORDER BY created_at DESC`,
    [req.params.id]
  );

  const advances = await query<any>(
    `SELECT id, amount, advance_date as advanceDate, slip_photo_url as slipPhotoUrl, notes
     FROM advance_salaries WHERE employee_id = ? ORDER BY advance_date DESC`,
    [req.params.id]
  );

  // Attendance summary: only PRESENT and ABSENT are valid statuses
  const attendance = await queryOne<any>(
    `SELECT
      SUM(CASE WHEN status = 'PRESENT' THEN 1 ELSE 0 END) as presentDays,
      SUM(CASE WHEN status = 'ABSENT' THEN 1 ELSE 0 END) as absentDays
     FROM attendance
     WHERE employee_id = ?
       AND date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)`,
    [req.params.id]
  );

  res.json({
    data: {
      employee: {
        id: employee.id,
        employeeId: employee.employeeId,
        fullName: employee.fullName,
        email: employee.email,
        phone: employee.phone,
        hireDate: employee.hireDate,
        salaryType: employee.salaryType,
        baseSalary: employee.baseSalary ? Number(employee.baseSalary) : null,
        isActive: !!employee.isActive,
        department: employee.department_id
          ? { id: employee.department_id, name: employee.department_name }
          : null,
        role: employee.role_id
          ? {
              id: employee.role_id,
              name: employee.role_name,
              dailyWage: employee.role_daily_wage ? Number(employee.role_daily_wage) : null,
            }
          : null,
        address: {
          line1: employee.address_line1,
          line2: employee.address_line2,
          city: employee.city,
          region: employee.region,
        },
      },
      salarySettings: {},
      salaryPromotions,
      salaryHistory: salaryHistory.map((s) => ({
        ...s,
        totalSalary: Number(s.totalSalary || 0),
        bonus: Number(s.bonus || 0),
        advanceDeductions: Number(s.advanceDeductions || 0),
        loanDeductions: Number(s.loanDeductions || 0),
        baseSalary: s.baseSalary ? Number(s.baseSalary) : null,
        dailyWageTotal: Number(s.dailyWageTotal || 0),
      })),
      loans,
      advances: advances.map((a) => ({ ...a, amount: Number(a.amount || 0) })),
      attendanceSummary: {
        presentDays: Number(attendance?.presentDays || 0),
        absentDays: Number(attendance?.absentDays || 0),
      },
    },
  });
};

/**
 * DELETE /employees/:id
 * Soft-deletes an employee by setting is_active to false.
 */
// PUBLIC_INTERFACE
export const deleteEmployee = async (req: AuthRequest, res: Response): Promise<void> => {
  const existing = await queryOne<{ id: string }>('SELECT id FROM employees WHERE id = ?', [req.params.id]);
  if (!existing) {
    res.status(404).json({ error: 'Employee not found' });
    return;
  }

  await execute('UPDATE employees SET is_active = false, updated_at = NOW() WHERE id = ?', [req.params.id]);
  res.json({ message: 'Employee deleted successfully' });
};
