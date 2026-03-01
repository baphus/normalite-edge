import { Router } from 'express';
import { calendarController } from '../../controllers/calendar.controller';
import { authenticate } from '../../middleware/authenticate';

const router = Router();

router.use(authenticate);

router.get('/', calendarController.getEvents);

export default router;
