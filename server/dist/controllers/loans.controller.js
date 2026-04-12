"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateInstallment = exports.updateLoan = exports.createLoan = exports.getLoan = exports.getLoans = void 0;
const db_1 = require("../utils/db");
const getLoans = async (req, res) => {
    const { employeeId, status } = req.query;
    let sql = `
    SELECT l.id, l.employee_id as employeeId, l.loan_amount as loanAmount, l.remaining_balance as remainingBalance,
           l.status, l.created_at as createdAt, e.full_name as employeeName
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
        })),
    });
};
exports.getLoans = getLoans;
const getLoan = async (req, res) => {
    const loan = await (0, db_1.queryOne)(`SELECT id, employee_id as employeeId, loan_amount as loanAmount, remaining_balance as remainingBalance, status
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
            installments: installments.map((i) => ({ ...i, amount: Number(i.amount || 0) })),
        },
    });
};
exports.getLoan = getLoan;
const createLoan = async (req, res) => {
    const { employeeId, loanAmount, status } = req.body;
    if (!employeeId || !loanAmount) {
        res.status(400).json({ error: 'employeeId and loanAmount are required' });
        return;
    }
    const id = (0, db_1.generateId)();
    await (0, db_1.execute)(`INSERT INTO loans (id, employee_id, loan_amount, remaining_balance, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, NOW(), NOW())`, [id, employeeId, loanAmount, loanAmount, status || 'ACTIVE']);
    res.status(201).json({ data: { id } });
};
exports.createLoan = createLoan;
const updateLoan = async (req, res) => {
    const existing = await (0, db_1.queryOne)('SELECT id FROM loans WHERE id = ?', [req.params.id]);
    if (!existing) {
        res.status(404).json({ error: 'Loan not found' });
        return;
    }
    const { status, remainingBalance } = req.body;
    await (0, db_1.execute)(`UPDATE loans
     SET status = COALESCE(?, status),
         remaining_balance = COALESCE(?, remaining_balance),
         updated_at = NOW()
     WHERE id = ?`, [status ?? null, remainingBalance ?? null, req.params.id]);
    res.json({ message: 'Loan updated' });
};
exports.updateLoan = updateLoan;
const updateInstallment = async (req, res) => {
    const installment = await (0, db_1.queryOne)('SELECT id FROM loan_installments WHERE id = ?', [req.params.id]);
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
    res.json({ message: 'Installment updated' });
};
exports.updateInstallment = updateInstallment;
