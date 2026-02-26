import { Router } from 'express';
import { authController } from '../../controllers/auth.controller';
import { authenticate } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import {
	registerSchema,
	loginSchema,
	resendVerificationSchema,
	updateProfileSchema,
	verifyEmailSchema,
} from '../../validators/auth.validator';

const router = Router();

// Public
router.post('/register', validate(registerSchema), authController.register);
router.post('/verify-email', validate(verifyEmailSchema), authController.verifyEmail);
router.post('/resend-verification', validate(resendVerificationSchema), authController.resendVerification);
router.post('/login', validate(loginSchema), authController.login);
router.post('/refresh', authController.refreshToken);

// Protected
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.getMe);
router.patch('/me/profile', authenticate, validate(updateProfileSchema), authController.updateProfile);

export default router;
