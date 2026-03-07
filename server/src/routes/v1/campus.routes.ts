import { Router } from 'express';
import { campusController } from '../../controllers/campus.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { campusIdParamSchema, createCampusSchema, updateCampusSchema } from '../../validators/campus.validator';

const router = Router();

router.get('/', campusController.listCampuses);
router.post('/', authenticate, authorize('ADMIN'), validate(createCampusSchema), campusController.createCampus);
router.patch('/:id', authenticate, authorize('ADMIN'), validate(campusIdParamSchema, 'params'), validate(updateCampusSchema), campusController.updateCampus);
router.delete('/:id', authenticate, authorize('ADMIN'), validate(campusIdParamSchema, 'params'), campusController.deleteCampus);

export default router;
