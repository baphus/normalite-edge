import { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { ApiResponse } from '../utils/ApiResponse';
import { examService } from '../services/exam.service';

export const examController = {
    listExams: catchAsync(async (req: Request, res: Response) => {
        const { page, limit, subject, program, isPublished } = req.query;
        const publishedOrMine = req.user?.role === 'REVIEWEE' ? req.user.userId : undefined;

        const result = await examService.listExams({
            page: page ? parseInt(page as string) : undefined,
            limit: limit ? parseInt(limit as string) : undefined,
            subject: subject as string,
            program: program as string,
            isPublished: isPublished !== undefined ? isPublished === 'true' : undefined,
            publishedOrMine,
        });

        ApiResponse.paginated(res, result.exams, {
            total: result.total,
            page: result.page,
            limit: result.limit,
        });
    }),

    listManagedExams: catchAsync(async (req: Request, res: Response) => {
        const { page, limit } = req.query;
        const result = await examService.listExams({
            page: page ? parseInt(page as string) : undefined,
            limit: limit ? parseInt(limit as string) : undefined,
            createdBy: req.user!.userId,
        });

        ApiResponse.paginated(res, result.exams, {
            total: result.total,
            page: result.page,
            limit: result.limit,
        });
    }),

    getExam: catchAsync(async (req: Request, res: Response) => {
        const includeQuestions = req.query.questions === 'true';
        const exam = await examService.getExam(req.params.id as string, includeQuestions);
        ApiResponse.success(res, exam);
    }),

    getExamForAttempt: catchAsync(async (req: Request, res: Response) => {
        const exam = await examService.getExamForAttempt(req.params.id as string);
        ApiResponse.success(res, exam);
    }),

    createExam: catchAsync(async (req: Request, res: Response) => {
        const exam = await examService.createExam({
            ...req.body,
            createdBy: req.user!.userId,
        });
        ApiResponse.created(res, exam, 'Exam created successfully');
    }),

    updateExam: catchAsync(async (req: Request, res: Response) => {
        const exam = await examService.updateExam(req.params.id as string, req.user!.userId, req.body);
        ApiResponse.success(res, exam, 'Exam updated successfully');
    }),

    deleteExam: catchAsync(async (req: Request, res: Response) => {
        await examService.deleteExam(req.params.id as string);
        ApiResponse.success(res, null, 'Exam deleted');
    }),
};
