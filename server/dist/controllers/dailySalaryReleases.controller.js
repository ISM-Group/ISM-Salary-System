"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEmployeeDailyReleases = exports.deleteDailyRelease = exports.releaseAllDailySalaries = exports.releaseDailySalary = exports.getDailyReleases = exports.generateDailyReleases = void 0;
const db_1 = require("../utils/db");
const auditLog_1 = require("../utils/auditLog");
const holidays_controller_1 = require("./holidays.controller");
/**
 * Generates daily salary release records for all daily-wage employees
 * who were PRESENT on the specified date, or who have a PAID holiday
 * on that date. Skips employees who already have a release record for
 * that date. Daily loan deductions are only applied when the employee
 * is present (absent days skip loan payments). On PAID holidays,
 * employees receive their full daily wage without attendance.
 * Approved advance deductions taken on that date are also subtracted.
 *
 * Only PRESENT/ABSENT attendance statuses are supported.
 * Logs the action with actor role attribution (ADMIN vs MANAGER).
 *
 * POST /api/daily-releases/generate
 * Body: { date: string (YYYY-MM-DD) }
 * Returns: { data: { generated: number, skipped: number, holidayGenerated: number } }
 */
// PUBLIC_INTERFACE
const generateDailyReleases = async (req, res) => {
    try {
        const { date } = req.body;
        if (!date) {
            res.status(400).json({ error: 'date is required (YYYY-MM-DD)' });
            return;
        }
        // Validate date format
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(date)) {
            res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
            return;
        }
        let generated = 0;
        let skipped = 0;
        let holidayGenerated = 0;
        // Step 0.5: Check for PAID holidays and generate holiday pay for eligible employees
        // For PAID holidays, daily-wage employees get their daily wage even without attendance
        const holidayEligibleEmployees = await (0, db_1.query)(`SELECT
         e.id AS employeeId,
         e.full_name AS employeeName,
         e.role_id AS roleId,
         r.daily_wage AS dailyWage
       FROM employees e
       LEFT JOIN roles r ON r.id = e.role_id
       WHERE e.salary_type = 'DAILY_WAGE'
         AND e.is_active = TRUE
         AND e.id NOT IN (
           SELECT dsr.employee_id
           FROM daily_salary_releases dsr
           WHERE dsr.release_date = ?
         )
         AND e.id NOT IN (
           SELECT a.employee_id
           FROM attendance a
           WHERE a.date = ? AND a.status = 'PRESENT'
         )`, [date, date]);
        // Generate holiday pay for employees who have a PAID holiday on this date
        // but were not marked PRESENT (they don't need to be present on a paid holiday)
        for (const emp of holidayEligibleEmployees) {
            const holiday = await (0, holidays_controller_1.isHolidayForEmployee)(emp.employeeId, date);
            if (holiday && holiday.type === 'PAID') {
                const fullDailyWage = Number(emp.dailyWage || 0);
                if (fullDailyWage <= 0) {
                    skipped++;
                    continue;
                }
                // No loan deductions on holidays — employee is not working
                // No advance deductions on holidays either (advances are tied to working days)
                const id = (0, db_1.generateId)();
                await (0, db_1.execute)(`INSERT INTO daily_salary_releases
           (id, employee_id, release_date, daily_wage, loan_deduction, advance_deduction, net_amount, status, attendance_status, created_at, updated_at)
           VALUES (?, ?, ?, ?, 0, 0, ?, 'PENDING', 'PRESENT', NOW(), NOW())`, [id, emp.employeeId, date, fullDailyWage, fullDailyWage]);
                holidayGenerated++;
                generated++;
            }
        }
        // Step 1: Find all daily-wage employees who were PRESENT on this date
        // and do NOT already have a release record for this date.
        // Only PRESENT attendance records qualify — ABSENT is excluded.
        // Daily loan deductions naturally skip non-working (ABSENT) days.
        const presentEmployees = await (0, db_1.query)(`SELECT 
         e.id AS employeeId,
         e.full_name AS employeeName,
         e.role_id AS roleId,
         r.daily_wage AS dailyWage,
         a.status AS attendanceStatus
       FROM attendance a
       INNER JOIN employees e ON e.id = a.employee_id
       LEFT JOIN roles r ON r.id = e.role_id
       WHERE a.date = ?
         AND a.status = 'PRESENT'
         AND e.salary_type = 'DAILY_WAGE'
         AND e.is_active = TRUE
         AND e.id NOT IN (
           SELECT dsr.employee_id 
           FROM daily_salary_releases dsr 
           WHERE dsr.release_date = ?
         )`, [date, date]);
        for (const emp of presentEmployees) {
            // Full daily wage for PRESENT employees
            const dailyWage = Number(emp.dailyWage || 0);
            if (dailyWage <= 0) {
                // Skip employees without a valid daily wage configured on their role
                skipped++;
                continue;
            }
            // Step 2: Calculate daily loan deduction for this employee.
            // Only ACTIVE loans with DAILY repayment mode are considered.
            // Because we only generate releases for PRESENT days, absent days
            // automatically skip loan deductions.
            let dailyLoanDeduction = 0;
            try {
                const loanRows = await (0, db_1.query)(`SELECT COALESCE(SUM(l.daily_repayment_amount), 0) AS totalDailyLoan
           FROM loans l
           WHERE l.employee_id = ?
             AND l.status = 'ACTIVE'
             AND l.repayment_mode = 'DAILY'
             AND l.daily_repayment_amount > 0`, [emp.employeeId]);
                dailyLoanDeduction = Number(loanRows[0]?.totalDailyLoan || 0);
            }
            catch {
                // Graceful fallback: if repayment columns don't exist yet, default to 0
                dailyLoanDeduction = 0;
            }
            // Step 3: Calculate advance deductions taken on this specific date.
            // Only APPROVED advances are deducted from daily salary.
            let advanceDeduction = 0;
            const advRows = await (0, db_1.query)(`SELECT COALESCE(SUM(a.amount), 0) AS totalAdvance
         FROM advance_salaries a
         WHERE a.employee_id = ?
           AND a.advance_date = ?
           AND a.status = 'APPROVED'`, [emp.employeeId, date]);
            advanceDeduction = Number(advRows[0]?.totalAdvance || 0);
            // Step 4: Calculate net amount
            // Net amount is the daily wage minus all deductions.
            // Net can be negative if deductions exceed the daily wage.
            const totalDeductions = dailyLoanDeduction + advanceDeduction;
            const netAmount = dailyWage - totalDeductions;
            // Step 5: Insert the release record
            const id = (0, db_1.generateId)();
            await (0, db_1.execute)(`INSERT INTO daily_salary_releases 
         (id, employee_id, release_date, daily_wage, loan_deduction, advance_deduction, net_amount, status, attendance_status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', 'PRESENT', NOW(), NOW())`, [id, emp.employeeId, date, dailyWage, dailyLoanDeduction, advanceDeduction, netAmount]);
            generated++;
        }
        // Audit log with actor role attribution
        await (0, auditLog_1.writeAuditLog)({
            tableName: 'daily_salary_releases',
            action: auditLog_1.AuditAction.CREATE,
            changedBy: req.user?.id,
            actorRole: req.user?.role,
            newData: { date, generated, skipped, holidayGenerated },
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            description: `Daily salary releases generated for ${date}: ${generated} created, ${skipped} skipped, ${holidayGenerated} holiday-pay`,
        });
        const parts = [];
        if (generated > 0)
            parts.push(`Generated ${generated} daily release record(s)`);
        if (holidayGenerated > 0)
            parts.push(`including ${holidayGenerated} holiday pay record(s)`);
        if (skipped > 0)
            parts.push(`${skipped} skipped`);
        const msg = parts.length > 0 ? parts.join('. ') + '.' : 'No eligible daily-wage employees found for this date.';
        res.json({
            data: { generated, skipped, holidayGenerated },
            message: msg,
        });
    }
    catch (error) {
        console.error('generateDailyReleases error:', error);
        res.status(500).json({ error: 'Failed to generate daily releases' });
    }
};
exports.generateDailyReleases = generateDailyReleases;
/**
 * Retrieves all daily salary release records for a given date,
 * including employee details and release status.
 *
 * GET /api/daily-releases?date=YYYY-MM-DD
 * Returns: { data: DailyRelease[], summary: ReleaseSummary }
 */
// PUBLIC_INTERFACE
const getDailyReleases = async (req, res) => {
    try {
        const date = req.query.date || new Date().toISOString().slice(0, 10);
        const rows = await (0, db_1.query)(`SELECT 
         dsr.id,
         dsr.employee_id AS employeeId,
         e.full_name AS employeeName,
         e.employee_id AS employeeCode,
         dsr.release_date AS releaseDate,
         dsr.daily_wage AS dailyWage,
         dsr.loan_deduction AS loanDeduction,
         dsr.advance_deduction AS advanceDeduction,
         dsr.net_amount AS netAmount,
         dsr.status,
         dsr.attendance_status AS attendanceStatus,
         dsr.released_by AS releasedBy,
         u.full_name AS releasedByName,
         dsr.created_at AS createdAt,
         dsr.updated_at AS updatedAt
       FROM daily_salary_releases dsr
       INNER JOIN employees e ON e.id = dsr.employee_id
       LEFT JOIN users u ON u.id = dsr.released_by
       WHERE dsr.release_date = ?
       ORDER BY e.full_name ASC`, [date]);
        // Compute summary totals
        let totalDailyWages = 0;
        let totalLoanDeductions = 0;
        let totalAdvanceDeductions = 0;
        let totalNetAmount = 0;
        let pendingCount = 0;
        let releasedCount = 0;
        const data = rows.map((row) => {
            const dw = Number(row.dailyWage || 0);
            const ld = Number(row.loanDeduction || 0);
            const ad = Number(row.advanceDeduction || 0);
            const na = Number(row.netAmount || 0);
            totalDailyWages += dw;
            totalLoanDeductions += ld;
            totalAdvanceDeductions += ad;
            totalNetAmount += na;
            if (row.status === 'PENDING')
                pendingCount++;
            else
                releasedCount++;
            return {
                ...row,
                dailyWage: dw,
                loanDeduction: ld,
                advanceDeduction: ad,
                netAmount: na,
            };
        });
        res.json({
            data,
            summary: {
                totalRecords: data.length,
                pendingCount,
                releasedCount,
                totalDailyWages,
                totalLoanDeductions,
                totalAdvanceDeductions,
                totalNetAmount,
            },
        });
    }
    catch (error) {
        console.error('getDailyReleases error:', error);
        res.status(500).json({ error: 'Failed to fetch daily releases' });
    }
};
exports.getDailyReleases = getDailyReleases;
/**
 * Marks an individual daily salary release as RELEASED.
 * Only PENDING releases can be released. When released, any loan
 * deduction amount is subtracted from the corresponding active
 * daily-repayment loans' remaining_balance.
 * Logs the action with actor role attribution (ADMIN vs MANAGER).
 *
 * PUT /api/daily-releases/:id/release
 * Returns: { message: string }
 */
// PUBLIC_INTERFACE
const releaseDailySalary = async (req, res) => {
    try {
        const { id } = req.params;
        const existing = await (0, db_1.queryOne)(`SELECT id, status, employee_id, release_date, loan_deduction FROM daily_salary_releases WHERE id = ?`, [id]);
        if (!existing) {
            res.status(404).json({ error: 'Daily release record not found' });
            return;
        }
        if (existing.status === 'RELEASED') {
            res.status(400).json({ error: 'This release has already been marked as RELEASED' });
            return;
        }
        await (0, db_1.execute)(`UPDATE daily_salary_releases 
       SET status = 'RELEASED', released_by = ?, updated_at = NOW()
       WHERE id = ?`, [req.user?.id || null, id]);
        // Decrement loan remaining_balance for active daily-repayment loans
        // when there is a loan deduction on this release
        const loanDeduction = Number(existing.loan_deduction || 0);
        if (loanDeduction > 0) {
            await deductLoanBalances(existing.employee_id, loanDeduction);
        }
        // Audit log with actor role attribution
        await (0, auditLog_1.writeAuditLog)({
            tableName: 'daily_salary_releases',
            action: auditLog_1.AuditAction.RELEASE,
            changedBy: req.user?.id,
            actorRole: req.user?.role,
            recordId: id,
            previousData: { status: 'PENDING', employeeId: existing.employee_id, releaseDate: existing.release_date },
            newData: { status: 'RELEASED', releasedBy: req.user?.id },
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            description: `Daily salary release ${id} marked as RELEASED`,
        });
        res.json({ message: 'Daily salary released successfully' });
    }
    catch (error) {
        console.error('releaseDailySalary error:', error);
        res.status(500).json({ error: 'Failed to release daily salary' });
    }
};
exports.releaseDailySalary = releaseDailySalary;
/**
 * Bulk-marks all PENDING daily salary releases for a given date as RELEASED.
 * Also decrements loan balances for each released record that has loan deductions.
 * Logs the action with actor role attribution (ADMIN vs MANAGER).
 *
 * PUT /api/daily-releases/release-all
 * Body: { date: string (YYYY-MM-DD) }
 * Returns: { data: { released: number }, message: string }
 */
// PUBLIC_INTERFACE
const releaseAllDailySalaries = async (req, res) => {
    try {
        const { date } = req.body;
        if (!date) {
            res.status(400).json({ error: 'date is required (YYYY-MM-DD)' });
            return;
        }
        // Fetch all pending releases for loan balance updates before marking as released
        const pendingReleases = await (0, db_1.query)(`SELECT id, employee_id, loan_deduction FROM daily_salary_releases
       WHERE release_date = ? AND status = 'PENDING'`, [date]);
        const result = await (0, db_1.execute)(`UPDATE daily_salary_releases 
       SET status = 'RELEASED', released_by = ?, updated_at = NOW()
       WHERE release_date = ? AND status = 'PENDING'`, [req.user?.id || null, date]);
        const releasedCount = result.affectedRows;
        // Decrement loan balances for each released record
        for (const rel of pendingReleases) {
            const loanDeduction = Number(rel.loan_deduction || 0);
            if (loanDeduction > 0) {
                await deductLoanBalances(rel.employee_id, loanDeduction);
            }
        }
        // Audit log with actor role attribution
        await (0, auditLog_1.writeAuditLog)({
            tableName: 'daily_salary_releases',
            action: auditLog_1.AuditAction.RELEASE,
            changedBy: req.user?.id,
            actorRole: req.user?.role,
            newData: { date, bulkReleased: releasedCount },
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            description: `Bulk release of ${releasedCount} daily salary record(s) for ${date}`,
        });
        res.json({
            data: { released: releasedCount },
            message: `${releasedCount} daily release(s) marked as RELEASED.`,
        });
    }
    catch (error) {
        console.error('releaseAllDailySalaries error:', error);
        res.status(500).json({ error: 'Failed to bulk-release daily salaries' });
    }
};
exports.releaseAllDailySalaries = releaseAllDailySalaries;
/**
 * Deletes a PENDING daily salary release record. Only PENDING releases
 * can be deleted — RELEASED records are immutable.
 * Logs the action with actor role attribution (ADMIN vs MANAGER).
 *
 * DELETE /api/daily-releases/:id
 * Returns: { message: string }
 */
// PUBLIC_INTERFACE
const deleteDailyRelease = async (req, res) => {
    try {
        const { id } = req.params;
        const existing = await (0, db_1.queryOne)(`SELECT id, status, employee_id, release_date FROM daily_salary_releases WHERE id = ?`, [id]);
        if (!existing) {
            res.status(404).json({ error: 'Daily release record not found' });
            return;
        }
        if (existing.status === 'RELEASED') {
            res.status(400).json({ error: 'Cannot delete a release that has already been RELEASED' });
            return;
        }
        await (0, db_1.execute)(`DELETE FROM daily_salary_releases WHERE id = ?`, [id]);
        // Audit log with actor role attribution
        await (0, auditLog_1.writeAuditLog)({
            tableName: 'daily_salary_releases',
            action: auditLog_1.AuditAction.DELETE,
            changedBy: req.user?.id,
            actorRole: req.user?.role,
            recordId: id,
            previousData: {
                employeeId: existing.employee_id,
                releaseDate: existing.release_date,
                status: existing.status,
            },
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            description: `Daily salary release record ${id} deleted`,
        });
        res.json({ message: 'Daily release record deleted successfully' });
    }
    catch (error) {
        console.error('deleteDailyRelease error:', error);
        res.status(500).json({ error: 'Failed to delete daily release' });
    }
};
exports.deleteDailyRelease = deleteDailyRelease;
/**
 * Retrieves daily salary release history for a specific employee.
 * Accessible by ADMIN or the employee viewing their own records.
 *
 * GET /api/daily-releases/employee/:employeeId?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Returns: { data: DailyRelease[], summary: { totalEarned: number, totalDeductions: number, totalNet: number } }
 */
// PUBLIC_INTERFACE
const getEmployeeDailyReleases = async (req, res) => {
    try {
        const { employeeId } = req.params;
        const { from, to } = req.query;
        let sql = `SELECT 
         dsr.id,
         dsr.employee_id AS employeeId,
         e.full_name AS employeeName,
         e.employee_id AS employeeCode,
         dsr.release_date AS releaseDate,
         dsr.daily_wage AS dailyWage,
         dsr.loan_deduction AS loanDeduction,
         dsr.advance_deduction AS advanceDeduction,
         dsr.net_amount AS netAmount,
         dsr.status,
         dsr.attendance_status AS attendanceStatus,
         dsr.released_by AS releasedBy,
         dsr.created_at AS createdAt
       FROM daily_salary_releases dsr
       INNER JOIN employees e ON e.id = dsr.employee_id
       WHERE dsr.employee_id = ?`;
        const params = [employeeId];
        if (from) {
            sql += ` AND dsr.release_date >= ?`;
            params.push(from);
        }
        if (to) {
            sql += ` AND dsr.release_date <= ?`;
            params.push(to);
        }
        sql += ` ORDER BY dsr.release_date DESC`;
        const rows = await (0, db_1.query)(sql, params);
        let totalEarned = 0;
        let totalDeductions = 0;
        let totalNet = 0;
        const data = rows.map((row) => {
            const dw = Number(row.dailyWage || 0);
            const ld = Number(row.loanDeduction || 0);
            const ad = Number(row.advanceDeduction || 0);
            const na = Number(row.netAmount || 0);
            totalEarned += dw;
            totalDeductions += ld + ad;
            totalNet += na;
            return { ...row, dailyWage: dw, loanDeduction: ld, advanceDeduction: ad, netAmount: na };
        });
        res.json({
            data,
            summary: { totalEarned, totalDeductions, totalNet, recordCount: data.length },
        });
    }
    catch (error) {
        console.error('getEmployeeDailyReleases error:', error);
        res.status(500).json({ error: 'Failed to fetch employee daily releases' });
    }
};
exports.getEmployeeDailyReleases = getEmployeeDailyReleases;
/**
 * Internal helper: decrements active daily-repayment loan balances for
 * an employee by the given deduction amount. Distributes the deduction
 * across active daily loans proportionally to their daily_repayment_amount.
 * Marks a loan as PAID if remaining_balance reaches zero or below.
 *
 * @param employeeId - The employee whose loans should be updated
 * @param totalDeduction - The total daily loan deduction to apply
 */
async function deductLoanBalances(employeeId, totalDeduction) {
    try {
        // Find all active daily-repayment loans for the employee
        const activeLoans = await (0, db_1.query)(`SELECT id, daily_repayment_amount, remaining_balance
       FROM loans
       WHERE employee_id = ?
         AND status = 'ACTIVE'
         AND repayment_mode = 'DAILY'
         AND daily_repayment_amount > 0
       ORDER BY created_at ASC`, [employeeId]);
        if (activeLoans.length === 0)
            return;
        let remaining = totalDeduction;
        for (const loan of activeLoans) {
            if (remaining <= 0)
                break;
            const dailyAmt = Number(loan.daily_repayment_amount || 0);
            // Deduct up to the loan's daily_repayment_amount (or whatever remains)
            const deductionForThisLoan = Math.min(dailyAmt, remaining);
            const newBalance = Math.max(0, Number(loan.remaining_balance || 0) - deductionForThisLoan);
            // Update the loan's remaining_balance; mark as PAID if fully repaid
            const newStatus = newBalance <= 0 ? 'PAID' : 'ACTIVE';
            await (0, db_1.execute)(`UPDATE loans SET remaining_balance = ?, status = ?, updated_at = NOW() WHERE id = ?`, [newBalance, newStatus, loan.id]);
            remaining -= deductionForThisLoan;
        }
    }
    catch (err) {
        // Log but don't fail the release — loan tracking is supplementary
        console.error('deductLoanBalances error:', err);
    }
}
