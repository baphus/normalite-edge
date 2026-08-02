import { Router } from 'express';
import { uploadController } from '../../controllers/upload.controller';
import { authenticate, requireSupabaseSession } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import { uploadImageSchema, uploadPublicProfileImageSchema } from '../../validators/upload.validator';

const router = Router();

/**
 * Profile picture upload for someone who is signed in but has no application
 * account yet — the Complete Profile page.
 *
 * `requireSupabaseSession` rather than `authenticate` on purpose: `authenticate`
 * demands a `public.users` row, which is created only once that page is
 * submitted, so a new Google user could never replace the suggested avatar.
 * The folder is fixed to `profile-pics` by the controller and the schema has no
 * folder field, so a session alone cannot reach the question-image bucket. The
 * route is covered by `uploadLimiter`.
 */
router.post('/public-profile-image', requireSupabaseSession, validate(uploadPublicProfileImageSchema), uploadController.uploadPublicProfileImage);
router.post('/image', authenticate, validate(uploadImageSchema), uploadController.uploadImage);

export default router;
