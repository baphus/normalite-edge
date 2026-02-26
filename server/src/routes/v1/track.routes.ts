import { Router } from 'express';
import { trackController } from '../../controllers/track.controller';

const router = Router();

router.get('/', trackController.listTracks);

export default router;
