import { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { ApiResponse } from '../utils/ApiResponse';
import { parsePagination } from '../utils/pagination';
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

    resetAttemptForTabViolation: catchAsync(async (req: Request, res: Response) => {
        const attempt = await attemptService.resetAttemptForTabViolation(
            req.params.id as string,
            req.user!.userId,
        );
        ApiResponse.success(res, attempt, 'Attempt reset due to tab switch violation');
    }),

    listAttempts: catchAsync(async (req: Request, res: Response) => {
        const { examId } = req.query;
        const { page, limit } = parsePagination(req.query as any);
        const isAdmin = req.user!.role === 'ADMIN' || req.user!.role === 'REVIEWER';

        const result = await attemptService.listAttempts({
            userId: isAdmin ? undefined : req.user!.userId,
            examId: examId as string,
            page,
            limit,
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

    getAttemptResult: catchAsync(async (req: Request, res: Response) => {
        const isAdmin = req.user!.role === 'ADMIN' || req.user!.role === 'REVIEWER';
        const attempt = await attemptService.getAttemptResult(
            req.params.id as string,
            req.user!.userId,
            isAdmin
        );
        ApiResponse.success(res, attempt);
    }),
};
