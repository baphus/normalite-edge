import { Router } from 'express';
import { notificationController } from '../../controllers/notification.controller';
import { authenticate } from '../../middleware/authenticate';

const router = Router();

router.get('/stream', notificationController.streamNotifications);

router.use(authenticate);

router.post('/sse-ticket', notificationController.createSseTicket);
router.get('/', notificationController.listNotifications);
router.get('/unread-count', notificationController.getUnreadCount);
router.patch('/:id/read', notificationController.markAsRead);
router.patch('/read-all', notificationController.markAllAsRead);

export default router;
