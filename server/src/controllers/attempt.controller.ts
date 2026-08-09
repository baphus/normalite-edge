import { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import { parsePagination } from '../utils/pagination';
import { attemptService } from '../services/attempt.service';

export const attemptController = {
    startAttempt: catchAsync(async (req: Request, res: Response) => {
        const attempt = await attemptService.startAttempt(req.user!.userId, req.body.examId);
        ApiResponse.created(res, attempt, 'Attempt started');
    }),

    getPreviousAttempt: catchAsync(async (req: Request, res: Response) => {
        const userId = (req as any).user.userId;
        const { examId, currentAttemptId } = req.query;
        if (!examId || typeof examId !== 'string') {
            throw ApiError.badRequest('examId query parameter is required');
        }
        const attempt = await attemptService.getPreviousAttempt(userId, examId, currentAttemptId as string | undefined);
        res.json({ data: attempt });
    }),

    submitAttempt: catchAsync(async (req: Request, res: Response) => {
        // `tz` is the client's UTC offset in minutes (e.g. -480 for UTC+8).
        const tzParsed = parseInt(String(req.query.tz), 10);
        const timezoneOffset = Number.isNaN(tzParsed) ? 0 : tzParsed;
        const attempt = await attemptService.submitAttempt(
            req.params.id as string,
            req.user!.userId,
            req.body,
            timezoneOffset
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
            // Admin/reviewer views grade and rank first attempts only; retakes
            // are invisible in the submissions list.
            firstAttemptOnly: isAdmin,
            isAdmin,
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
