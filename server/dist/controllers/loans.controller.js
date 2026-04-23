"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateInstallment = exports.updateLoan = exports.createLoan = exports.getLoan = exports.getLoans = void 0;
const db_1 = require("../utils/db");
const auditLog_1 = require("../utils/auditLog");
/**
 * Retrieves all loans with optional filtering by employee and status.
 *
 * GET /api/loans?employeeId=...&status=...
 * Returns: { data: Loan[] }
 */
// PUBLIC_INTERFACE
const getLoans = async (req, res) => {
    const { employeeId, status } = req.query;
    let sql = `
    SELECT l.id, l.employee_id as employeeId, l.loan_amount as loanAmount,
           l.remaining_balance as remainingBalance, l.status,
           l.repayment_mode as repaymentMode,
           l.daily_repayment_amount as dailyRepaymentAmount,
           l.created_at as createdAt, e.full_name as employeeName
    FROM loans l
    INNER JOIN employees e ON e.id = l.employee_id
    WHERE 1=1
  `;
    const params = [];
    if (employeeId) {
        sql += ' AND l.employee_id = ?';
        params.push(employeeId);
    }
    if (status) {
        sql += ' AND l.status = ?';
        params.push(status);
    }
    sql += ' ORDER BY l.created_at DESC';
    const rows = await (0, db_1.query)(sql, params);
    res.json({
        data: rows.map((r) => ({
            ...r,
            loanAmount: Number(r.loanAmount || 0),
            remainingBalance: Number(r.remainingBalance || 0),
            dailyRepaymentAmount: Number(r.dailyRepaymentAmount || 0),
        })),
    });
};
exports.getLoans = getLoans;
/**
 * Retrieves a single loan by ID along with its installments.
 *
 * GET /api/loans/:id
 * Returns: { data: Loan & { installments: Installment[] } }
 */
// PUBLIC_INTERFACE
const getLoan = async (req, res) => {
    const loan = await (0, db_1.queryOne)(`SELECT id, employee_id as employeeId, loan_amount as loanAmount,
            remaining_balance as remainingBalance, status,
            repayment_mode as repaymentMode,
            daily_repayment_amount as dailyRepaymentAmount
     FROM loans WHERE id = ?`, [req.params.id]);
    if (!loan) {
        res.status(404).json({ error: 'Loan not found' });
        return;
    }
    const installments = await (0, db_1.query)(`SELECT id, installment_number as installmentNumber, due_month as dueMonth, amount, status
     FROM loan_installments
     WHERE loan_id = ?
     ORDER BY installment_number ASC`, [req.params.id]);
    res.json({
        data: {
            ...loan,
            loanAmount: Number(loan.loanAmount || 0),
            remainingBalance: Number(loan.remainingBalance || 0),
            dailyRepaymentAmount: Number(loan.dailyRepaymentAmount || 0),
            installments: installments.map((i) => ({ ...i, amount: Number(i.amount || 0) })),
        },
    });
};
exports.getLoan = getLoan;
/**
 * Creates a new loan record. Supports both MONTHLY and DAILY repayment modes.
 * For DAILY repayment mode, a daily_repayment_amount must be provided;
 * this amount is deducted from daily salary releases on PRESENT days only.
 * Logs the action with actor role attribution (ADMIN vs MANAGER).
 *
 * POST /api/loans
 * Body: { employeeId, loanAmount, status?, repaymentMode?, dailyRepaymentAmount? }
 * Returns: { data: { id: string } }
 */
// PUBLIC_INTERFACE
const createLoan = async (req, res) => {
    const { employeeId, loanAmount, status, repaymentMode, dailyRepaymentAmount } = req.body;
    if (!employeeId || !loanAmount) {
        res.status(400).json({ error: 'employeeId and loanAmount are required' });
        return;
    }
    const mode = repaymentMode === 'DAILY' ? 'DAILY' : 'MONTHLY';
    const dailyAmt = mode === 'DAILY' ? Number(dailyRepaymentAmount || 0) : 0;
    const id = (0, db_1.generateId)();
    await (0, db_1.execute)(`INSERT INTO loans (id, employee_id, loan_amount, remaining_balance, status, repayment_mode, daily_repayment_amount, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`, [id, employeeId, loanAmount, loanAmount, status || 'ACTIVE', mode, dailyAmt]);
    // Audit log with actor role attribution
    await (0, auditLog_1.writeAuditLog)({
        tableName: 'loans',
        action: auditLog_1.AuditAction.CREATE,
        changedBy: req.user?.id,
        actorRole: req.user?.role,
        recordId: id,
        newData: { employeeId, loanAmount, status: status || 'ACTIVE', repaymentMode: mode, dailyRepaymentAmount: dailyAmt },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        description: 'Loan created',
    }).catch((err) => console.error('Audit log write failed (createLoan):', err));
    res.status(201).json({ data: { id } });
};
exports.createLoan = createLoan;
/**
 * Updates an existing loan's status, balance, or repayment settings.
 * Captures before/after snapshots and logs with actor role attribution.
 *
 * PUT /api/loans/:id
 * Body: { status?, remainingBalance?, repaymentMode?, dailyRepaymentAmount? }
 * Returns: { message: string }
 */
// PUBLIC_INTERFACE
const updateLoan = async (req, res) => {
    const existing = await (0, db_1.queryOne)('SELECT * FROM loans WHERE id = ?', [req.params.id]);
    if (!existing) {
        res.status(404).json({ error: 'Loan not found' });
        return;
    }
    const { status, remainingBalance, repaymentMode, dailyRepaymentAmount } = req.body;
    await (0, db_1.execute)(`UPDATE loans
     SET status = COALESCE(?, status),
         remaining_balance = COALESCE(?, remaining_balance),
         repayment_mode = COALESCE(?, repayment_mode),
         daily_repayment_amount = COALESCE(?, daily_repayment_amount),
         updated_at = NOW()
     WHERE id = ?`, [
        status ?? null,
        remainingBalance ?? null,
        repaymentMode ?? null,
        dailyRepaymentAmount ?? null,
        req.params.id,
    ]);
    // Audit log with actor role attribution and before/after data
    await (0, auditLog_1.writeAuditLog)({
        tableName: 'loans',
        action: auditLog_1.AuditAction.UPDATE,
        changedBy: req.user?.id,
        actorRole: req.user?.role,
        recordId: req.params.id,
        previousData: existing,
        newData: { status, remainingBalance, repaymentMode, dailyRepaymentAmount },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        description: 'Loan updated',
    }).catch((err) => console.error('Audit log write failed (updateLoan):', err));
    res.json({ message: 'Loan updated' });
};
exports.updateLoan = updateLoan;
/**
 * Updates a single loan installment's amount or status.
 * Captures before/after snapshots and logs with actor role attribution.
 *
 * PUT /api/loans/installments/:id
 * Body: { amount?, status? }
 * Returns: { message: string }
 */
// PUBLIC_INTERFACE
const updateInstallment = async (req, res) => {
    const installment = await (0, db_1.queryOne)('SELECT * FROM loan_installments WHERE id = ?', [req.params.id]);
    if (!installment) {
        res.status(404).json({ error: 'Installment not found' });
        return;
    }
    const { amount, status } = req.body;
    await (0, db_1.execute)(`UPDATE loan_installments
     SET amount = COALESCE(?, amount),
         status = COALESCE(?, status),
         updated_at = NOW()
     WHERE id = ?`, [amount ?? null, status ?? null, req.params.id]);
    // Audit log with actor role attribution and before/after data
    await (0, auditLog_1.writeAuditLog)({
        tableName: 'loan_installments',
        action: auditLog_1.AuditAction.UPDATE,
        changedBy: req.user?.id,
        actorRole: req.user?.role,
        recordId: req.params.id,
        previousData: installment,
        newData: { amount, status },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        description: 'Loan installment updated',
    }).catch((err) => console.error('Audit log write failed (updateInstallment):', err));
    res.json({ message: 'Installment updated' });
};
exports.updateInstallment = updateInstallment;
