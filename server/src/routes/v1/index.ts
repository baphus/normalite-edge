import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import examRoutes from './exam.routes';
import attemptRoutes from './attempt.routes';
import deckRoutes from './deck.routes';
import trackRoutes from './track.routes';
import campusRoutes from './campus.routes';
import sessionRoutes from './session.routes';
import notificationRoutes from './notification.routes';
import dashboardRoutes from './dashboard.routes';
import auditRoutes from './audit.routes';
import reportRoutes from './report.routes';
import uploadRoutes from './upload.routes';
import calendarRoutes from './calendar.routes';
import systemSettingRoutes from './system-setting.routes';
import { ApiError } from '../../utils/ApiError';

const router = Router();

// ─── Global UUID Validation for Path Parameters ────────
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UUID_PARAM_NAMES = ['id', 'sessionId', 'examId', 'attemptId', 'deckId'];

for (const paramName of UUID_PARAM_NAMES) {
    router.param(paramName, (req, _res, next, value) => {
        if (!UUID_REGEX.test(value)) {
            return next(ApiError.badRequest(`Invalid ${paramName} format`));
        }
        next();
    });
}

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/exams', examRoutes);
router.use('/attempts', attemptRoutes);
router.use('/decks', deckRoutes);
router.use('/tracks', trackRoutes);
router.use('/campuses', campusRoutes);
router.use('/sessions', sessionRoutes);
router.use('/notifications', notificationRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/audit', auditRoutes);
router.use('/reports', reportRoutes);
router.use('/uploads', uploadRoutes);
router.use('/calendar', calendarRoutes);
router.use('/settings', systemSettingRoutes);

export default router;
