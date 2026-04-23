/**
 * Salary Routes
 *
 * Handles salary calculations and history retrieval.
 * - POST /calculate    — Calculate salary for an employee
 * - GET  /history      — Get salary calculation history
 */
import { Router } from 'express';
import { calculateSalary, getSalaryHistory } from '../controllers/salary.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { calculateSalarySchema } from '../validation/schemas';

const router = Router();

router.use(authenticate);

router.post('/calculate', validate(calculateSalarySchema), calculateSalary);
router.get('/history', getSalaryHistory);

export default router;
