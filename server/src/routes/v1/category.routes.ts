import { Router } from 'express';
import { categoryController } from '../../controllers/category.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { createCategorySchema, updateCategorySchema } from '../../validators/category.validator';

const router = Router();

router.use(authenticate);

// All authenticated users can list categories
router.get('/', categoryController.listCategories);

// Admin and Reviewer can create categories
router.post('/', authorize('ADMIN', 'REVIEWER'), validate(createCategorySchema), categoryController.createCategory);

// Admin only can update/delete categories
router.patch('/:id', authorize('ADMIN'), validate(updateCategorySchema), categoryController.updateCategory);
router.delete('/:id', authorize('ADMIN'), categoryController.deleteCategory);

// List exams in a category (admin/reviewer only to avoid leaking non-visible exams)
router.get('/:id/exams', authorize('ADMIN', 'REVIEWER'), categoryController.getCategoryExams);

export default router;
