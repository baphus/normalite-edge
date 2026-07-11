import { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { ApiResponse } from '../utils/ApiResponse';
import { parsePagination } from '../utils/pagination';
import { examService } from '../services/exam.service';
import { auditService } from '../services/audit.service';
import { resolveProgramTrack } from '../utils/requirementsCompat';

export const examController = {
    listExams: catchAsync(async (req: Request, res: Response) => {
        const { subject, category, program, program_track, isPublished } = req.query;
        const { page, limit } = parsePagination(req.query as any);
        const publishedOrMine = req.user?.role === 'REVIEWEE' ? req.user.userId : undefined;

        const result = await examService.listExams({
            page,
            limit,
            subject: subject as string,
            category: category as any,
            program: resolveProgramTrack({
                program: program as string,
                program_track: program_track as string,
            }),
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
        const { page, limit } = parsePagination(req.query as any);
        const result = await examService.listExams({
            page,
            limit,
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

    exportExamToStudyDeck: catchAsync(async (req: Request, res: Response) => {
        const deck = await examService.exportExamToStudyDeck(
            req.params.id as string,
            req.user!.userId,
            req.user!.role as any,
        );

        await auditService.log({
            actorId: req.user!.userId,
            actorRole: req.user!.role as any,
            action: 'CREATE',
            entityType: 'study_deck',
            entityId: deck.id,
            summary: `Exported exam ${req.params.id as string} as study deck: ${deck.title}`,
            metadata: {
                sourceExamId: req.params.id as string,
                title: deck.title,
            },
        });

        ApiResponse.created(res, deck, 'Mock exam exported to study materials');
    }),

    getSubmissionAnalytics: catchAsync(async (req: Request, res: Response) => {
        const analytics = await examService.getSubmissionAnalytics(
            req.params.id as string,
            req.user!.userId,
            req.user!.role as any,
        );
        ApiResponse.success(res, analytics);
    }),

    getExamForAttempt: catchAsync(async (req: Request, res: Response) => {
        const exam = await examService.getExamForAttempt(req.params.id as string);
        ApiResponse.success(res, exam);
    }),

    createExam: catchAsync(async (req: Request, res: Response) => {
        const resolvedProgram = req.body.trackIds?.length
            ? undefined
            : resolveProgramTrack(req.body);

        const exam = await examService.createExam({
            ...req.body,
            program: resolvedProgram,
            createdBy: req.user!.userId,
        });

        await auditService.log({
            actorId: req.user!.userId,
            actorRole: req.user!.role as any,
            action: 'CREATE',
            entityType: 'exam',
            entityId: exam.id,
            summary: `Created exam: ${exam.title}`,
            metadata: {
                title: exam.title,
            },
        });

        ApiResponse.created(res, exam, 'Exam created successfully');
    }),

    updateExam: catchAsync(async (req: Request, res: Response) => {
        const resolvedProgram = req.body.trackIds?.length
            ? undefined
            : resolveProgramTrack(req.body);

        const exam = await examService.updateExam(
            req.params.id as string,
            req.user!.userId,
            req.user!.role as any,
            {
                ...req.body,
                program: resolvedProgram,
            }
        );

        await auditService.log({
            actorId: req.user!.userId,
            actorRole: req.user!.role as any,
            action: 'UPDATE',
            entityType: 'exam',
            entityId: exam.id,
            summary: `Updated exam: ${exam.title}`,
            metadata: {
                title: exam.title,
            },
        });

        ApiResponse.success(res, exam, 'Exam updated successfully');
    }),

    deleteExam: catchAsync(async (req: Request, res: Response) => {
        const deleted = await examService.deleteExam(req.params.id as string, req.user!.userId, req.user!.role as any);

        await auditService.log({
            actorId: req.user!.userId,
            actorRole: req.user!.role as any,
            action: 'DELETE',
            entityType: 'exam',
            entityId: req.params.id as string,
            summary: `Deleted exam: ${deleted.title}`,
        });

        ApiResponse.success(res, null, 'Exam deleted');
    }),
};
