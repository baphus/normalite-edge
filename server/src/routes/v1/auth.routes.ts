import { Router } from 'express';
import { authController } from '../../controllers/auth.controller';
import { authenticate } from '../../middleware/authenticate';
import { requireCsrfHeader } from '../../middleware/csrfProtection';
import { validate } from '../../middleware/validate';
import {
	registerSchema,
	loginSchema,
	completeOnboardingSchema,
	completeTourSchema,
	updateProfileSchema,
} from '../../validators/auth.validator';

const router = Router();

// Public
router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/refresh', requireCsrfHeader, authController.refreshToken);

// Protected
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.getMe);
router.patch('/me/profile', authenticate, validate(updateProfileSchema), authController.updateProfile);
router.post('/onboarding', authenticate, validate(completeOnboardingSchema), authController.completeOnboarding);
router.post('/me/tours', authenticate, validate(completeTourSchema), authController.completeTour);

export default router;
