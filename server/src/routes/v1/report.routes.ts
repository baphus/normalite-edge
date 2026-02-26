import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { reportController } from '../../controllers/report.controller';

const router = Router();

router.use(authenticate);
router.use(authorize('ADMIN'));

router.get('/exam-performance', reportController.getExamPerformance);
router.get('/exam-performance/export', reportController.exportExamPerformance);

export default router;
