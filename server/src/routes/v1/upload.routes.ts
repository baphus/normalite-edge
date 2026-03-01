import { Router } from 'express';
import { uploadController } from '../../controllers/upload.controller';
import { authenticate } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import { uploadImageSchema } from '../../validators/upload.validator';

const router = Router();

router.post('/image', authenticate, validate(uploadImageSchema), uploadController.uploadImage);

export default router;
