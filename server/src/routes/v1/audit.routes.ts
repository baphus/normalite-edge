import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { auditController } from '../../controllers/audit.controller';

const router = Router();

router.use(authenticate);
router.get('/logs', authorize('ADMIN'), auditController.listLogs);
router.get('/activity', authorize('ADMIN', 'REVIEWER'), auditController.listContentActivity);

export default router;
