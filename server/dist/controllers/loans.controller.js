"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extendLoan = exports.settleLoan = exports.updateInstallment = exports.updateLoan = exports.createLoan = exports.getLoan = exports.getLoans = void 0;
const db_1 = require("../utils/db");
const auditLog_1 = require("../utils/auditLog");
const pagination_1 = require("../utils/pagination");
// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------
/**
 * Generates `loan_installments` rows for a MONTHLY-repayment loan.
 */
const generateMonthlyInstallments = async (loanId, loanAmount, numInstallments = 12, startMonth) => {
    let baseDate;
    if (startMonth) {
        baseDate = new Date(startMonth);
    }
    else {
        const now = new Date();
        baseDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    }
    const perInstallment = Math.floor((loanAmount / numInstallments) * 100) / 100;
    const lastInstallmentAmount = Math.round((loanAmount - perInstallment * (numInstallments - 1)) * 100) / 100;
    for (let i = 0; i < numInstallments; i++) {
        const dueMonth = new Date(baseDate.getFullYear(), baseDate.getMonth() + i, 1);
        const dueMonthStr = dueMonth.toISOString().substring(0, 10);
        const amount = i === numInstallments - 1 ? lastInstallmentAmount : perInstallment;
        const id = (0, db_1.generateId)();
        await (0, db_1.execute)(`INSERT INTO loan_installments
         (id, loan_id, installment_number, due_month, amount, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'PENDING', NOW(), NOW())`, [id, loanId, i + 1, dueMonthStr, amount]);
    }
};
// ---------------------------------------------------------------------------
// Public controller handlers
// ---------------------------------------------------------------------------
/**
 * Retrieves all loans with optional filtering by employee and status.
 * Supports server-side pagination via ?page=&limit= query parameters.
 *
 * GET /api/loans?employeeId=...&status=...&page=...&limit=...
 * Returns: { data: Loan[], pagination: PaginationMeta }
 */
// PUBLIC_INTERFACE
const getLoans = async (req, res) => {
    const { employeeId, status } = req.query;
    const pagination = (0, pagination_1.parsePagination)(req.query);
    const selectFields = `l.id, l.employee_id as employeeId, l.loan_amount as loanAmount,
           l.remaining_balance as remainingBalance, l.status,
           l.repayment_mode as repaymentMode,
           l.daily_repayment_amount as dailyRepaymentAmount,
           l.created_at as createdAt, e.full_name as employeeName`;
    const fromClause = `FROM loans l INNER JOIN employees e ON e.id = l.employee_id`;
    let whereClause = 'WHERE 1=1';
    const params = [];
    if (employeeId) {
        whereClause += ' AND l.employee_id = ?';
        params.push(employeeId);
    }
    if (status) {
        whereClause += ' AND l.status = ?';
        params.push(status);
    }
    const countResult = await (0, db_1.queryOne)(`SELECT COUNT(*) AS total ${fromClause} ${whereClause}`, params);
    const total = Number(countResult?.total || 0);
    const dataSql = `SELECT ${selectFields} ${fromClause} ${whereClause} ORDER BY l.created_at DESC LIMIT ? OFFSET ?`;
    const rows = await (0, db_1.query)(dataSql, [...params, pagination.limit, pagination.offset]);
    res.json({
        data: rows.map((r) => ({
            ...r,
            loanAmount: Number(r.loanAmount || 0),
            remainingBalance: Number(r.remainingBalance || 0),
            dailyRepaymentAmount: Number(r.dailyRepaymentAmount || 0),
        })),
        pagination: (0, pagination_1.buildPaginationMeta)(total, pagination),
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
    const installments = await (0, db_1.query)(`SELECT id, installment_number as installmentNumber, due_month as dueMonth,
            amount, status, paid_at as paidAt
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
 *
 * POST /api/loans
 */
// PUBLIC_INTERFACE
const createLoan = async (req, res) => {
    const { employeeId, loanAmount, status, repaymentMode, dailyRepaymentAmount, numInstallments, startMonth, } = req.body;
    if (!employeeId || !loanAmount) {
        res.status(400).json({ error: 'employeeId and loanAmount are required' });
        return;
    }
    const mode = repaymentMode === 'DAILY' ? 'DAILY' : 'MONTHLY';
    const dailyAmt = mode === 'DAILY' ? Number(dailyRepaymentAmount || 0) : 0;
    const amount = Number(loanAmount);
    const id = (0, db_1.generateId)();
    await (0, db_1.execute)(`INSERT INTO loans
       (id, employee_id, loan_amount, remaining_balance, status, repayment_mode,
        daily_repayment_amount, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`, [id, employeeId, amount, amount, status || 'ACTIVE', mode, dailyAmt]);
    if (mode === 'MONTHLY') {
        const installmentCount = numInstallments ? Number(numInstallments) : 12;
        const firstMonth = typeof startMonth === 'string' ? startMonth : undefined;
        await generateMonthlyInstallments(id, amount, installmentCount, firstMonth);
    }
    await (0, auditLog_1.writeAuditLog)({
        tableName: 'loans',
        action: auditLog_1.AuditAction.CREATE,
        changedBy: req.user?.id,
        actorRole: req.user?.role,
        recordId: id,
        newData: {
            employeeId,
            loanAmount: amount,
            status: status || 'ACTIVE',
            repaymentMode: mode,
            dailyRepaymentAmount: dailyAmt,
            numInstallments: mode === 'MONTHLY' ? (numInstallments || 12) : undefined,
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        description: 'Loan created',
    }).catch((err) => console.error('Audit log write failed (createLoan):', err));
    res.status(201).json({ data: { id } });
};
exports.createLoan = createLoan;
/**
 * Updates an existing loan's status, balance, or repayment settings.
 *
 * PUT /api/loans/:id
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
 *
 * PUT /api/loans/installments/:id
 */
// PUBLIC_INTERFACE
const updateInstallment = async (req, res) => {
    const installment = await (0, db_1.queryOne)('SELECT * FROM loan_installments WHERE id = ?', [
        req.params.id,
    ]);
    if (!installment) {
        res.status(404).json({ error: 'Installment not found' });
        return;
    }
    const { amount, status } = req.body;
    const paidAt = status === 'PAID' ? 'NOW()' : null;
    if (paidAt) {
        await (0, db_1.execute)(`UPDATE loan_installments
       SET amount = COALESCE(?, amount),
           status = COALESCE(?, status),
           paid_at = NOW(),
           updated_at = NOW()
       WHERE id = ?`, [amount ?? null, status ?? null, req.params.id]);
    }
    else {
        await (0, db_1.execute)(`UPDATE loan_installments
       SET amount = COALESCE(?, amount),
           status = COALESCE(?, status),
           updated_at = NOW()
       WHERE id = ?`, [amount ?? null, status ?? null, req.params.id]);
    }
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
/**
 * Early-settle a loan: marks the loan as PAID and closes all pending installments.
 *
 * POST /api/loans/:id/settle
 */
// PUBLIC_INTERFACE
const settleLoan = async (req, res) => {
    const loan = await (0, db_1.queryOne)('SELECT * FROM loans WHERE id = ?', [req.params.id]);
    if (!loan) {
        res.status(404).json({ error: 'Loan not found' });
        return;
    }
    if (loan.status !== 'ACTIVE') {
        res.status(400).json({ error: `Loan is already ${loan.status} and cannot be settled` });
        return;
    }
    await (0, db_1.execute)(`UPDATE loans
     SET status = 'PAID', remaining_balance = 0, updated_at = NOW()
     WHERE id = ?`, [req.params.id]);
    await (0, db_1.execute)(`UPDATE loan_installments
     SET status = 'PAID', paid_at = NOW(), updated_at = NOW()
     WHERE loan_id = ? AND status = 'PENDING'`, [req.params.id]);
    const { notes } = req.body;
    await (0, auditLog_1.writeAuditLog)({
        tableName: 'loans',
        action: auditLog_1.AuditAction.UPDATE,
        changedBy: req.user?.id,
        actorRole: req.user?.role,
        recordId: req.params.id,
        previousData: loan,
        newData: { status: 'PAID', remainingBalance: 0, notes },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        description: 'Loan early-settled',
    }).catch((err) => console.error('Audit log write failed (settleLoan):', err));
    res.json({ message: 'Loan settled successfully' });
};
exports.settleLoan = settleLoan;
/**
 * Extends a MONTHLY loan by adding extra installments to the schedule.
 *
 * POST /api/loans/:id/extend
 */
// PUBLIC_INTERFACE
const extendLoan = async (req, res) => {
    const loan = await (0, db_1.queryOne)('SELECT * FROM loans WHERE id = ?', [req.params.id]);
    if (!loan) {
        res.status(404).json({ error: 'Loan not found' });
        return;
    }
    if (loan.status !== 'ACTIVE') {
        res.status(400).json({ error: `Loan is ${loan.status} and cannot be extended` });
        return;
    }
    if (loan.repayment_mode !== 'MONTHLY') {
        res.status(400).json({ error: 'Only MONTHLY repayment loans can be extended via this endpoint' });
        return;
    }
    const { numInstallments, installmentAmount, notes } = req.body;
    const extra = Number(numInstallments);
    if (!extra || extra < 1 || extra > 60) {
        res.status(400).json({ error: 'numInstallments must be between 1 and 60' });
        return;
    }
    const lastInstallmentRow = await (0, db_1.queryOne)(`SELECT MAX(installment_number) as maxNum, due_month as lastDueMonth
     FROM loan_installments
     WHERE loan_id = ?`, [req.params.id]);
    const currentMax = lastInstallmentRow?.maxNum ?? 0;
    let nextDueDate;
    if (lastInstallmentRow?.lastDueMonth) {
        const lastDue = new Date(lastInstallmentRow.lastDueMonth);
        nextDueDate = new Date(lastDue.getFullYear(), lastDue.getMonth() + 1, 1);
    }
    else {
        const now = new Date();
        nextDueDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    }
    const remainingBalance = Number(loan.remaining_balance || 0);
    const perAmt = installmentAmount
        ? Number(installmentAmount)
        : Math.round((remainingBalance / extra) * 100) / 100;
    for (let i = 0; i < extra; i++) {
        const dueDate = new Date(nextDueDate.getFullYear(), nextDueDate.getMonth() + i, 1);
        const dueDateStr = dueDate.toISOString().substring(0, 10);
        const id = (0, db_1.generateId)();
        await (0, db_1.execute)(`INSERT INTO loan_installments
         (id, loan_id, installment_number, due_month, amount, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'PENDING', NOW(), NOW())`, [id, req.params.id, currentMax + i + 1, dueDateStr, perAmt]);
    }
    await (0, auditLog_1.writeAuditLog)({
        tableName: 'loans',
        action: auditLog_1.AuditAction.UPDATE,
        changedBy: req.user?.id,
        actorRole: req.user?.role,
        recordId: req.params.id,
        previousData: loan,
        newData: { extended: true, addedInstallments: extra, perInstallmentAmount: perAmt, notes },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        description: `Loan extended by ${extra} installment(s)`,
    }).catch((err) => console.error('Audit log write failed (extendLoan):', err));
    res.json({ message: `Loan extended by ${extra} installment(s)`, addedInstallments: extra });
};
exports.extendLoan = extendLoan;
