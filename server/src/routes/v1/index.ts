import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import examRoutes from './exam.routes';
import attemptRoutes from './attempt.routes';
import materialRoutes from './material.routes';
import sessionRoutes from './session.routes';
import notificationRoutes from './notification.routes';
import dashboardRoutes from './dashboard.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/exams', examRoutes);
router.use('/attempts', attemptRoutes);
router.use('/materials', materialRoutes);
router.use('/sessions', sessionRoutes);
router.use('/notifications', notificationRoutes);
router.use('/dashboard', dashboardRoutes);

export default router;
