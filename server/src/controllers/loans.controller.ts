import { Response } from 'express';
import { execute, generateId, query, queryOne } from '../utils/db';
import { AuthRequest } from '../types';

export const getLoans = async (req: AuthRequest, res: Response): Promise<void> => {
  const { employeeId, status } = req.query as Record<string, string | undefined>;
  let sql = `
    SELECT l.id, l.employee_id as employeeId, l.loan_amount as loanAmount, l.remaining_balance as remainingBalance,
           l.status, l.created_at as createdAt, e.full_name as employeeName
    FROM loans l
    INNER JOIN employees e ON e.id = l.employee_id
    WHERE 1=1
  `;
  const params: unknown[] = [];

  if (employeeId) {
    sql += ' AND l.employee_id = ?';
    params.push(employeeId);
  }
  if (status) {
    sql += ' AND l.status = ?';
    params.push(status);
  }
  sql += ' ORDER BY l.created_at DESC';

  const rows = await query<any>(sql, params);
  res.json({
    data: rows.map((r) => ({
      ...r,
      loanAmount: Number(r.loanAmount || 0),
      remainingBalance: Number(r.remainingBalance || 0),
    })),
  });
};

export const getLoan = async (req: AuthRequest, res: Response): Promise<void> => {
  const loan = await queryOne<any>(
    `SELECT id, employee_id as employeeId, loan_amount as loanAmount, remaining_balance as remainingBalance, status
     FROM loans WHERE id = ?`,
    [req.params.id]
  );
  if (!loan) {
    res.status(404).json({ error: 'Loan not found' });
    return;
  }

  const installments = await query<any>(
    `SELECT id, installment_number as installmentNumber, due_month as dueMonth, amount, status
     FROM loan_installments
     WHERE loan_id = ?
     ORDER BY installment_number ASC`,
    [req.params.id]
  );

  res.json({
    data: {
      ...loan,
      loanAmount: Number(loan.loanAmount || 0),
      remainingBalance: Number(loan.remainingBalance || 0),
      installments: installments.map((i) => ({ ...i, amount: Number(i.amount || 0) })),
    },
  });
};

export const createLoan = async (req: AuthRequest, res: Response): Promise<void> => {
  const { employeeId, loanAmount, status } = req.body as Record<string, unknown>;
  if (!employeeId || !loanAmount) {
    res.status(400).json({ error: 'employeeId and loanAmount are required' });
    return;
  }

  const id = generateId();
  await execute(
    `INSERT INTO loans (id, employee_id, loan_amount, remaining_balance, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
    [id, employeeId, loanAmount, loanAmount, status || 'ACTIVE']
  );
  res.status(201).json({ data: { id } });
};

export const updateLoan = async (req: AuthRequest, res: Response): Promise<void> => {
  const existing = await queryOne<{ id: string }>('SELECT id FROM loans WHERE id = ?', [req.params.id]);
  if (!existing) {
    res.status(404).json({ error: 'Loan not found' });
    return;
  }

  const { status, remainingBalance } = req.body as Record<string, unknown>;
  await execute(
    `UPDATE loans
     SET status = COALESCE(?, status),
         remaining_balance = COALESCE(?, remaining_balance),
         updated_at = NOW()
     WHERE id = ?`,
    [status ?? null, remainingBalance ?? null, req.params.id]
  );
  res.json({ message: 'Loan updated' });
};

export const updateInstallment = async (req: AuthRequest, res: Response): Promise<void> => {
  const installment = await queryOne<{ id: string }>('SELECT id FROM loan_installments WHERE id = ?', [req.params.id]);
  if (!installment) {
    res.status(404).json({ error: 'Installment not found' });
    return;
  }

  const { amount, status } = req.body as Record<string, unknown>;
  await execute(
    `UPDATE loan_installments
     SET amount = COALESCE(?, amount),
         status = COALESCE(?, status),
         updated_at = NOW()
     WHERE id = ?`,
    [amount ?? null, status ?? null, req.params.id]
  );
  res.json({ message: 'Installment updated' });
};
