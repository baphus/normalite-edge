import { Router } from 'express';
import { materialController } from '../../controllers/material.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';

const router = Router();

router.use(authenticate);

router.get('/', materialController.listMaterials);
router.get('/managed', authorize('ADMIN', 'REVIEWER'), materialController.listManagedMaterials);
router.get('/:id', materialController.getMaterial);
router.post('/', authorize('ADMIN', 'REVIEWER'), materialController.createMaterial);
router.put('/:id', authorize('ADMIN', 'REVIEWER'), materialController.updateMaterial);
router.delete('/:id', authorize('ADMIN', 'REVIEWER'), materialController.deleteMaterial);

export default router;
