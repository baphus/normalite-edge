import { Router } from 'express';
import { trackController } from '../../controllers/track.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { createTrackSchema, trackIdParamSchema, updateTrackSchema } from '../../validators/track.validator';

const router = Router();

router.get('/', trackController.listTracks);
router.post('/', authenticate, authorize('ADMIN'), validate(createTrackSchema), trackController.createTrack);
router.patch('/:id', authenticate, authorize('ADMIN'), validate(trackIdParamSchema, 'params'), validate(updateTrackSchema), trackController.updateTrack);
router.delete('/:id', authenticate, authorize('ADMIN'), validate(trackIdParamSchema, 'params'), trackController.deleteTrack);

export default router;
