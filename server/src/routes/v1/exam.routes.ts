import { Router } from 'express';
import { examController } from '../../controllers/exam.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { createExamSchema, updateExamSchema } from '../../validators/exam.validator';
import { parseDocxUpload } from '../../middleware/docxUpload';
import { wordImportController } from '../../controllers/word-import.controller';

const router = Router();

router.use(authenticate);

// All authenticated users can list and view exams
router.get('/', examController.listExams);
router.get('/managed', authorize('ADMIN', 'REVIEWER'), examController.listManagedExams);
router.get('/import/word/template', authorize('ADMIN', 'REVIEWER'), wordImportController.downloadWordTemplate);
router.post('/import/word', authorize('ADMIN', 'REVIEWER'), parseDocxUpload, wordImportController.importExamFromWord);
router.get('/:id', examController.getExam);
router.get('/:id/take', authorize('REVIEWEE'), examController.getExamForAttempt);

// Admin and Reviewer can create/update/delete
router.post('/', authorize('ADMIN', 'REVIEWER'), validate(createExamSchema), examController.createExam);
router.put('/:id', authorize('ADMIN', 'REVIEWER'), validate(updateExamSchema), examController.updateExam);
router.delete('/:id', authorize('ADMIN', 'REVIEWER'), examController.deleteExam);

export default router;
