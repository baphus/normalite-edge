import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import streakController from '../../controllers/streak.controller';

const router = Router();

router.get('/', authenticate, authorize('REVIEWEE'), streakController.getStreak);

export default router;
