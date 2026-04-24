"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateAdvanceSalaryStatus = exports.createAdvanceSalary = exports.getEmployeeAdvanceSalaries = exports.getAdvanceSalaries = void 0;
const db_1 = require("../utils/db");
const auditLog_1 = require("../utils/auditLog");
const fileStorage_1 = require("../utils/fileStorage");
/**
 * Retrieves all advance salary records with optional filtering.
 * Returns the status field so that the daily salary release system
 * can distinguish APPROVED advances for deduction.
 *
 * GET /api/advance-salaries?employeeId=...&from=...&to=...&status=...
 * Returns: { data: AdvanceSalary[] }
 */
// PUBLIC_INTERFACE
const getAdvanceSalaries = async (req, res) => {
    const { employeeId, from, to, status } = req.query;
    let sql = `
    SELECT a.id, a.employee_id as employeeId, a.amount, a.advance_date as advanceDate,
           a.slip_photo_url as slipPhotoUrl, a.notes, a.status,
           e.full_name as employeeName
    FROM advance_salaries a
    INNER JOIN employees e ON e.id = a.employee_id
    WHERE 1=1
  `;
    const params = [];
    if (employeeId) {
        sql += ' AND a.employee_id = ?';
        params.push(employeeId);
    }
    if (from) {
        sql += ' AND a.advance_date >= ?';
        params.push(from);
    }
    if (to) {
        sql += ' AND a.advance_date <= ?';
        params.push(to);
    }
    if (status) {
        sql += ' AND a.status = ?';
        params.push(status);
    }
    sql += ' ORDER BY a.advance_date DESC';
    const rows = await (0, db_1.query)(sql, params);
    res.json({
        data: rows.map((r) => ({ ...r, amount: Number(r.amount || 0) })),
    });
};
exports.getAdvanceSalaries = getAdvanceSalaries;
/**
 * Retrieves all advance salary records for a specific employee.
 *
 * GET /api/advance-salaries/employee/:employeeId
 * Returns: { data: AdvanceSalary[] }
 */
// PUBLIC_INTERFACE
const getEmployeeAdvanceSalaries = async (req, res) => {
    const rows = await (0, db_1.query)(`SELECT id, employee_id as employeeId, amount, advance_date as advanceDate,
            slip_photo_url as slipPhotoUrl, notes, status
     FROM advance_salaries
     WHERE employee_id = ?
     ORDER BY advance_date DESC`, [req.params.employeeId]);
    res.json({ data: rows.map((r) => ({ ...r, amount: Number(r.amount || 0) })) });
};
exports.getEmployeeAdvanceSalaries = getEmployeeAdvanceSalaries;
/**
 * Creates a new advance salary record. The status defaults to APPROVED
 * so that it is immediately eligible for deduction by the daily salary
 * release system. Optionally accepts a status override (PENDING, APPROVED, REJECTED).
 * Logs the action with actor role attribution (ADMIN vs MANAGER).
 *
 * POST /api/advance-salaries
 * Body (multipart): { employeeId, amount, advanceDate, notes?, status? }
 * Returns: { data: { id, slipPhotoUrl, status } }
 */
// PUBLIC_INTERFACE
const createAdvanceSalary = async (req, res) => {
    const { employeeId, amount, advanceDate, notes, status } = req.body;
    if (!employeeId || !amount || !advanceDate) {
        res.status(400).json({ error: 'employeeId, amount and advanceDate are required' });
        return;
    }
    // Validate status if provided
    const validStatuses = ['PENDING', 'APPROVED', 'REJECTED'];
    const advanceStatus = status && validStatuses.includes(status) ? status : 'APPROVED';
    const id = (0, db_1.generateId)();
    // req.file.filename is set by multer disk storage after writing the file to disk.
    // This replaces the old memory-storage approach where the file buffer was never persisted.
    const slipPhotoUrl = req.file ? (0, fileStorage_1.getUploadUrl)(req.file.filename) : null;
    await (0, db_1.execute)(`INSERT INTO advance_salaries
     (id, employee_id, amount, advance_date, slip_photo_url, notes, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`, [id, employeeId, amount, advanceDate, slipPhotoUrl, notes || null, advanceStatus]);
    // Audit log with actor role attribution
    await (0, auditLog_1.writeAuditLog)({
        tableName: 'advance_salaries',
        action: auditLog_1.AuditAction.CREATE,
        changedBy: req.user?.id,
        actorRole: req.user?.role,
        recordId: id,
        newData: { employeeId, amount, advanceDate, notes, status: advanceStatus },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        description: 'Advance salary created',
    }).catch((err) => console.error('Audit log write failed (createAdvanceSalary):', err));
    res.status(201).json({ data: { id, slipPhotoUrl, status: advanceStatus } });
};
exports.createAdvanceSalary = createAdvanceSalary;
/**
 * Updates the status of an advance salary record.
 * Used for the approval workflow: PENDING → APPROVED or REJECTED.
 * Only APPROVED advances are deducted from daily salary releases.
 * Logs the action with actor role attribution (ADMIN vs MANAGER).
 *
 * PUT /api/advance-salaries/:id/status
 * Body: { status: 'APPROVED' | 'REJECTED' | 'PENDING' }
 * Returns: { message: string }
 */
// PUBLIC_INTERFACE
const updateAdvanceSalaryStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!status) {
            res.status(400).json({ error: 'status is required' });
            return;
        }
        const validStatuses = ['PENDING', 'APPROVED', 'REJECTED'];
        if (!validStatuses.includes(status)) {
            res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
            return;
        }
        const existing = await (0, db_1.queryOne)(`SELECT id, status, employee_id, amount, advance_date FROM advance_salaries WHERE id = ?`, [id]);
        if (!existing) {
            res.status(404).json({ error: 'Advance salary record not found' });
            return;
        }
        const previousStatus = existing.status;
        await (0, db_1.execute)(`UPDATE advance_salaries SET status = ?, updated_at = NOW() WHERE id = ?`, [status, id]);
        // Determine the correct audit action based on new status
        const auditAction = status === 'APPROVED' ? auditLog_1.AuditAction.APPROVE : (status === 'REJECTED' ? auditLog_1.AuditAction.REJECT : auditLog_1.AuditAction.UPDATE);
        // Audit log with actor role attribution
        await (0, auditLog_1.writeAuditLog)({
            tableName: 'advance_salaries',
            action: auditAction,
            changedBy: req.user?.id,
            actorRole: req.user?.role,
            recordId: id,
            previousData: { status: previousStatus, employeeId: existing.employee_id, amount: existing.amount },
            newData: { status },
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            description: `Advance salary status changed from ${previousStatus} to ${status}`,
        });
        res.json({ message: `Advance salary status updated to ${status}` });
    }
    catch (error) {
        console.error('updateAdvanceSalaryStatus error:', error);
        res.status(500).json({ error: 'Failed to update advance salary status' });
    }
};
exports.updateAdvanceSalaryStatus = updateAdvanceSalaryStatus;
