import { Router } from 'express';
import { userController } from '../../controllers/user.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { createUserSchema, updateUserStatusSchema, updateUserRoleSchema } from '../../validators/user.validator';

const router = Router();

// Publicly available to all authenticated users
router.get('/achievements', authenticate, userController.getAchievements);

// All user management routes are admin-only
router.get('/', authenticate, authorize('ADMIN', 'REVIEWER'), userController.listUsers);
router.get('/:id/profile', authenticate, authorize('ADMIN', 'REVIEWER'), userController.getStudentProfile);
router.post('/', authenticate, authorize('ADMIN'), validate(createUserSchema), userController.createUser);
router.patch('/:id/status', authenticate, authorize('ADMIN'), validate(updateUserStatusSchema), userController.updateUserStatus);
router.patch('/:id/role', authenticate, authorize('ADMIN'), validate(updateUserRoleSchema), userController.updateUserRole);
router.delete('/:id', authenticate, authorize('ADMIN'), userController.deleteUser);

export default router;
