import { Router } from 'express';
import { dashboardController } from '../../controllers/dashboard.controller';
import { authenticate } from '../../middleware/authenticate';

const router = Router();

router.use(authenticate);

router.get('/stats', dashboardController.getStats);

export default router;
