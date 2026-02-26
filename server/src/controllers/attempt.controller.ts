import { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { ApiResponse } from '../utils/ApiResponse';
import { attemptService } from '../services/attempt.service';

export const attemptController = {
    startAttempt: catchAsync(async (req: Request, res: Response) => {
        const attempt = await attemptService.startAttempt(req.user!.userId, req.body.examId);
        ApiResponse.created(res, attempt, 'Attempt started');
    }),

    submitAttempt: catchAsync(async (req: Request, res: Response) => {
        const attempt = await attemptService.submitAttempt(
            req.params.id as string,
            req.user!.userId,
            req.body
        );
        ApiResponse.success(res, attempt, 'Attempt submitted');
    }),

    saveAttempt: catchAsync(async (req: Request, res: Response) => {
        const attempt = await attemptService.saveAttempt(
            req.params.id as string,
            req.user!.userId,
            req.body
        );
        ApiResponse.success(res, attempt, 'Attempt progress saved');
    }),

    listAttempts: catchAsync(async (req: Request, res: Response) => {
        const { page, limit, examId } = req.query;
        const isAdmin = req.user!.role === 'ADMIN' || req.user!.role === 'REVIEWER';

        const result = await attemptService.listAttempts({
            userId: isAdmin ? undefined : req.user!.userId,
            examId: examId as string,
            page: page ? parseInt(page as string) : undefined,
            limit: limit ? parseInt(limit as string) : undefined,
        });

        ApiResponse.paginated(res, result.attempts, {
            total: result.total,
            page: result.page,
            limit: result.limit,
        });
    }),

    getAttemptReview: catchAsync(async (req: Request, res: Response) => {
        const isAdmin = req.user!.role === 'ADMIN' || req.user!.role === 'REVIEWER';
        const attempt = await attemptService.getAttemptReview(
            req.params.id as string,
            req.user!.userId,
            isAdmin
        );
        ApiResponse.success(res, attempt);
    }),
};
