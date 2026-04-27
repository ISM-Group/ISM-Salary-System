import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  previewRelease,
  batchPreview,
  createRelease,
  batchCreateReleases,
  getReleases,
  getRelease,
  getEmployeeReleases,
  getEmployeeCalendar,
  updateRelease,
  releasePayment,
  batchRelease,
  deleteRelease,
} from '../controllers/salaryReleases.controller';

const router = Router();
router.use(authenticate);

router.post('/preview', previewRelease);
router.post('/batch-preview', batchPreview);
router.post('/batch', batchCreateReleases);
router.put('/batch-release', batchRelease);
router.post('/', createRelease);
router.get('/', getReleases);
router.get('/employee/:id', getEmployeeReleases);
router.get('/employee/:id/calendar', getEmployeeCalendar);
router.get('/:id', getRelease);
router.put('/:id/release', releasePayment);
router.put('/:id', updateRelease);
router.delete('/:id', deleteRelease);

export default router;
