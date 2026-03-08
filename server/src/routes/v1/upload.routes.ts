import { Router } from 'express';
import { uploadController } from '../../controllers/upload.controller';
import { authenticate } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import { uploadImageSchema, uploadPublicProfileImageSchema } from '../../validators/upload.validator';

const router = Router();

router.post('/public-profile-image', validate(uploadPublicProfileImageSchema), uploadController.uploadPublicProfileImage);
router.post('/image', authenticate, validate(uploadImageSchema), uploadController.uploadImage);

export default router;
