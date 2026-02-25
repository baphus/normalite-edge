import { Router } from 'express';
import { sessionController } from '../../controllers/session.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';

const router = Router();

router.use(authenticate);

router.get('/', sessionController.listSessions);
router.get('/:id', sessionController.getSession);
router.post('/', authorize('ADMIN', 'REVIEWER'), sessionController.createSession);
router.put('/:id', authorize('ADMIN', 'REVIEWER'), sessionController.updateSession);
router.delete('/:id', authorize('ADMIN', 'REVIEWER'), sessionController.deleteSession);

export default router;
