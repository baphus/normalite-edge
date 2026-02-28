import { Router } from 'express';
import { attemptController } from '../../controllers/attempt.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { saveAttemptSchema, submitAttemptSchema } from '../../validators/exam.validator';
import { startAttemptSchema } from '../../validators/attempt.validator';

const router = Router();

router.use(authenticate);

router.get('/', attemptController.listAttempts);
router.get('/:id/result', attemptController.getAttemptResult);
router.get('/:id', attemptController.getAttemptReview);
router.post('/', authorize('REVIEWEE'), validate(startAttemptSchema), attemptController.startAttempt);
router.patch('/:id/save', authorize('REVIEWEE'), validate(saveAttemptSchema), attemptController.saveAttempt);
router.put('/:id', authorize('REVIEWEE'), validate(submitAttemptSchema), attemptController.submitAttempt);

export default router;
