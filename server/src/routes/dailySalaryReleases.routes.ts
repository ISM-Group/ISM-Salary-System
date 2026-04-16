import { Router } from 'express';
import { getDailySalaryReleases } from '../controllers/dailySalaryReleases.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import { UserRole } from '../types';

const router = Router();

router.use(authenticate);
router.use(authorize(UserRole.ADMIN));

router.get('/', getDailySalaryReleases);

export default router;
