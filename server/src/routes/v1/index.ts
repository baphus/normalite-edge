import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import examRoutes from './exam.routes';
import attemptRoutes from './attempt.routes';
import deckRoutes from './deck.routes';
import trackRoutes from './track.routes';
import sessionRoutes from './session.routes';
import notificationRoutes from './notification.routes';
import dashboardRoutes from './dashboard.routes';
import auditRoutes from './audit.routes';
import reportRoutes from './report.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/exams', examRoutes);
router.use('/attempts', attemptRoutes);
router.use('/decks', deckRoutes);
router.use('/tracks', trackRoutes);
router.use('/sessions', sessionRoutes);
router.use('/notifications', notificationRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/audit', auditRoutes);
router.use('/reports', reportRoutes);

export default router;
