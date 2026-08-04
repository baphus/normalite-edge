import { Router } from 'express';
import { authController } from '../../controllers/auth.controller';
import { authenticate, requireSupabaseSession } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import {
	completeProfileSchema,
	completeOnboardingSchema,
	completeTourSchema,
	updateProfileSchema,
} from '../../validators/auth.validator';

const router = Router();

// Sign-in, sign-up, token refresh, and password management are handled by
// Supabase Auth directly from the browser. This service never issues tokens —
// it only verifies them and owns the application account behind them.

// Reachable with a valid Supabase session but no application profile yet.
router.get('/me', requireSupabaseSession, authController.getMe);
router.post(
	'/complete-profile',
	requireSupabaseSession,
	validate(completeProfileSchema),
	authController.completeProfile
);

// Require a provisioned, enabled application account.
router.post('/session-start', authenticate, authController.sessionStart);
router.post('/logout', authenticate, authController.logout);
router.patch('/me/profile', authenticate, validate(updateProfileSchema), authController.updateProfile);
router.post('/onboarding', authenticate, validate(completeOnboardingSchema), authController.completeOnboarding);
router.post('/me/tours', authenticate, validate(completeTourSchema), authController.completeTour);
router.post('/sessions/revoke-others', authenticate, authController.revokeOtherSessions);
router.patch('/me/deactivate', authenticate, authController.deactivateAccount);

export default router;
