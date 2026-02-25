import { Router } from 'express';
import { attemptController } from '../../controllers/attempt.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { submitAttemptSchema } from '../../validators/exam.validator';

const router = Router();

router.use(authenticate);

router.get('/', attemptController.listAttempts);
router.get('/:id', attemptController.getAttemptReview);
router.post('/', authorize('REVIEWEE'), attemptController.startAttempt);
router.put('/:id', authorize('REVIEWEE'), validate(submitAttemptSchema), attemptController.submitAttempt);

export default router;
