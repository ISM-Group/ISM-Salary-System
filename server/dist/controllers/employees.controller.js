"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteEmployee = exports.getEmployeeProfile = exports.updateEmployee = exports.createEmployee = exports.getEmployee = exports.getEmployees = void 0;
const db_1 = require("../utils/db");
const getEmployees = async (req, res) => {
    const { departmentId, isActive, search } = req.query;
    let sql = `
    SELECT
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
    WHERE 1=1
  `;
    const params = [];
    if (departmentId) {
        sql += ' AND e.department_id = ?';
        params.push(departmentId);
    }
    if (isActive === 'true' || isActive === 'false') {
        sql += ' AND e.is_active = ?';
        params.push(isActive === 'true');
    }
    if (search) {
        sql += ' AND (e.full_name LIKE ? OR e.employee_id LIKE ? OR e.email LIKE ? OR e.phone LIKE ?)';
        const q = `%${search}%`;
        params.push(q, q, q, q);
    }
    sql += ' ORDER BY e.full_name ASC';
    const rows = await (0, db_1.query)(sql, params);
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
    });
};
exports.getEmployees = getEmployees;
const getEmployee = async (req, res) => {
    const result = await (0, db_1.queryOne)(`SELECT
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
    WHERE e.id = ?`, [req.params.id]);
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
exports.getEmployee = getEmployee;
const createEmployee = async (req, res) => {
    const { employeeId, fullName, email, phone, departmentId, roleId, hireDate, salaryType, baseSalary, isActive, addressLine1, addressLine2, city, region, } = req.body;
    if (!employeeId || !fullName || !departmentId || !hireDate) {
        res.status(400).json({ error: 'employeeId, fullName, departmentId and hireDate are required' });
        return;
    }
    const id = (0, db_1.generateId)();
    await (0, db_1.execute)(`INSERT INTO employees (
      id, employee_id, full_name, email, phone, department_id, role_id, hire_date,
      salary_type, base_salary, is_active, address_line1, address_line2, city, region, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`, [
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
    ]);
    const created = await (0, db_1.queryOne)('SELECT id FROM employees WHERE id = ?', [id]);
    res.status(201).json({ data: created });
};
exports.createEmployee = createEmployee;
const updateEmployee = async (req, res) => {
    const existing = await (0, db_1.queryOne)('SELECT id FROM employees WHERE id = ?', [req.params.id]);
    if (!existing) {
        res.status(404).json({ error: 'Employee not found' });
        return;
    }
    const payload = req.body;
    await (0, db_1.execute)(`UPDATE employees
     SET employee_id = COALESCE(?, employee_id),
         full_name = COALESCE(?, full_name),
         email = COALESCE(?, email),
         phone = COALESCE(?, phone),
         department_id = COALESCE(?, department_id),
         role_id = COALESCE(?, role_id),
         hire_date = COALESCE(?, hire_date),
         salary_type = COALESCE(?, salary_type),
         base_salary = COALESCE(?, base_salary),
         is_active = COALESCE(?, is_active),
         address_line1 = COALESCE(?, address_line1),
         address_line2 = COALESCE(?, address_line2),
         city = COALESCE(?, city),
         region = COALESCE(?, region),
         updated_at = NOW()
     WHERE id = ?`, [
        payload.employeeId ?? null,
        payload.fullName ?? null,
        payload.email ?? null,
        payload.phone ?? null,
        payload.departmentId ?? null,
        payload.roleId ?? null,
        payload.hireDate ?? null,
        payload.salaryType ?? null,
        payload.baseSalary ?? null,
        payload.isActive ?? null,
        payload.addressLine1 ?? null,
        payload.addressLine2 ?? null,
        payload.city ?? null,
        payload.region ?? null,
        req.params.id,
    ]);
    res.json({ message: 'Employee updated successfully' });
};
exports.updateEmployee = updateEmployee;
const getEmployeeProfile = async (req, res) => {
    const employee = await (0, db_1.queryOne)(`SELECT
      e.id, e.employee_id as employeeId, e.full_name as fullName, e.email, e.phone, e.hire_date as hireDate,
      e.salary_type as salaryType, e.base_salary as baseSalary, e.is_active as isActive,
      e.address_line1, e.address_line2, e.city, e.region,
      d.id as department_id, d.name as department_name,
      r.id as role_id, r.name as role_name, r.daily_wage as role_daily_wage
    FROM employees e
    LEFT JOIN departments d ON d.id = e.department_id
    LEFT JOIN roles r ON r.id = e.role_id
    WHERE e.id = ?`, [req.params.id]);
    if (!employee) {
        res.status(404).json({ error: 'Employee not found' });
        return;
    }
    const salaryPromotions = await (0, db_1.query)(`SELECT id, effective_from as effectiveFrom, salary_type as salaryType, base_salary as baseSalary,
            reason, notes, changed_at as changedAt
     FROM employee_salary_history
     WHERE employee_id = ?
     ORDER BY effective_from DESC`, [req.params.id]);
    const salaryHistory = await (0, db_1.query)(`SELECT id, month, total_salary as totalSalary, bonus, advance_deductions as advanceDeductions,
            loan_deductions as loanDeductions, status, base_salary as baseSalary, daily_wage_total as dailyWageTotal
     FROM salary_calculations
     WHERE employee_id = ?
     ORDER BY month DESC
     LIMIT 12`, [req.params.id]);
    const loans = await (0, db_1.query)(`SELECT id, loan_amount as loanAmount, remaining_balance as remainingBalance, status
     FROM loans WHERE employee_id = ? ORDER BY created_at DESC`, [req.params.id]);
    const advances = await (0, db_1.query)(`SELECT id, amount, advance_date as advanceDate, slip_photo_url as slipPhotoUrl, notes
     FROM advance_salaries WHERE employee_id = ? ORDER BY advance_date DESC`, [req.params.id]);
    // Attendance summary: only PRESENT and ABSENT are valid statuses
    const attendance = await (0, db_1.queryOne)(`SELECT
      SUM(CASE WHEN status = 'PRESENT' THEN 1 ELSE 0 END) as presentDays,
      SUM(CASE WHEN status = 'ABSENT' THEN 1 ELSE 0 END) as absentDays
     FROM attendance
     WHERE employee_id = ?
       AND date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)`, [req.params.id]);
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
exports.getEmployeeProfile = getEmployeeProfile;
const deleteEmployee = async (req, res) => {
    const existing = await (0, db_1.queryOne)('SELECT id FROM employees WHERE id = ?', [req.params.id]);
    if (!existing) {
        res.status(404).json({ error: 'Employee not found' });
        return;
    }
    await (0, db_1.execute)('DELETE FROM employees WHERE id = ?', [req.params.id]);
    res.json({ message: 'Employee deleted successfully' });
};
exports.deleteEmployee = deleteEmployee;
