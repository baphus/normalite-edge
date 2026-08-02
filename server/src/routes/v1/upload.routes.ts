import { Router, Request } from 'express';
import rateLimit from 'express-rate-limit';
import { uploadController } from '../../controllers/upload.controller';
import { authenticate, requireRegistrationSession } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import { uploadImageSchema, uploadPublicProfileImageSchema } from '../../validators/upload.validator';

const router = Router();

/**
 * Upload limits live on the router, not on an `app.use` path prefix.
 *
 * A prefix mount is matched against the raw URL, which Express does not
 * normalise: `/api/v1//uploads/image` reaches this router but misses a
 * `/api/v1/uploads` mount, so one extra slash was enough to skip the limiter
 * entirely. Attached here, it applies however the path is spelled.
 *
 * Keyed by identity rather than IP, and placed after the auth middleware so
 * the identity is known. IP keying would let one user — or an unauthenticated
 * request that never gets past the guard — exhaust the budget for everyone
 * behind the same NAT, which for a campus deployment is everyone.
 */
const perIdentityUploadLimiter = (max: number) => rateLimit({
    windowMs: 60 * 60 * 1000,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    // Both routes authenticate first, so an identity is always present.
    keyGenerator: (req: Request) => req.user?.userId ?? req.supabaseUser?.id ?? 'anonymous',
    message: { success: false, message: 'Upload limit reached, please try again later' },
});

/**
 * Profile picture upload for someone who is signed in but has no application
 * account yet — the Complete Profile page.
 *
 * `authenticate` would reject them: it demands a `public.users` row, which is
 * created only when that page is submitted, so a new Google user could never
 * replace the suggested avatar. `requireRegistrationSession` accepts an
 * identity that is eligible to register, and nothing weaker.
 *
 * The folder is fixed to `profile-pics` by the controller and the schema has no
 * folder field, so a session alone cannot reach the question-image bucket. One
 * avatar is all anyone needs, hence the tight limit.
 */
router.post(
    '/public-profile-image',
    requireRegistrationSession,
    perIdentityUploadLimiter(10),
    validate(uploadPublicProfileImageSchema),
    uploadController.uploadPublicProfileImage
);

// Exam authoring uploads one image per call, so this needs real headroom.
router.post(
    '/image',
    authenticate,
    perIdentityUploadLimiter(100),
    validate(uploadImageSchema),
    uploadController.uploadImage
);

export default router;
