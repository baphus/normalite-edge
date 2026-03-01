import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { systemSettingController } from '../../controllers/system-setting.controller';
import { updateSystemSettingsSchema } from '../../validators/system-setting.validator';

const router = Router();

router.use(authenticate);

router.get('/system', systemSettingController.getSettings);
router.patch('/system', authorize('ADMIN'), validate(updateSystemSettingsSchema), systemSettingController.updateSettings);

export default router;
