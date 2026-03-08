import { Router } from 'express';
import { dashboardController } from '../../controllers/dashboard.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { submitDailyQuestionAnswerSchema } from '../../validators/dashboard.validator';

const router = Router();

router.use(authenticate);

router.get('/stats', dashboardController.getStats);
router.get('/profile-performance', authorize('REVIEWEE'), dashboardController.getRevieweeProfilePerformance);
router.get('/daily-question', authorize('REVIEWEE'), dashboardController.getDailyQuestion);
router.post(
	'/daily-question/answer',
	authorize('REVIEWEE'),
	validate(submitDailyQuestionAnswerSchema),
	dashboardController.submitDailyQuestionAnswer
);

export default router;
