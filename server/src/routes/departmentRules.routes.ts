import { Router } from 'express';
import { getDepartmentRules, upsertDepartmentRules, deleteDepartmentRules } from '../controllers/departmentRules.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validate.middleware';
import { upsertDepartmentRulesSchema } from '../validation/schemas';
import { UserRole } from '../types';

const router = Router();

router.use(authenticate);

router.get('/:departmentId', getDepartmentRules);
router.put('/:departmentId', authorize(UserRole.ADMIN), validate(upsertDepartmentRulesSchema), upsertDepartmentRules);
router.delete('/:departmentId', authorize(UserRole.ADMIN), deleteDepartmentRules);

export default router;
