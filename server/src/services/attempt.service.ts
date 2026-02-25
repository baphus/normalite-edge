import prisma from '../config/db';
import { ApiError } from '../utils/ApiError';

export class AttemptService {
    /**
     * Start a new exam attempt.
     */
    async startAttempt(userId: string, examId: string) {
        // Check if exam exists and is published
        const exam = await prisma.exam.findUnique({ where: { id: examId } });
        if (!exam) throw ApiError.notFound('Exam not found');
        if (!exam.isPublished) throw ApiError.forbidden('Exam is not published');

        // Check for existing in-progress attempt
        const existing = await prisma.attempt.findFirst({
            where: { userId, examId, status: 'IN_PROGRESS' },
        });
        if (existing) {
            // Return existing attempt so user can resume
            return existing;
        }

        return prisma.attempt.create({
            data: {
                userId,
                examId,
                answers: {},
                status: 'IN_PROGRESS',
            },
            include: {
                exam: {
                    include: {
                        questions: {
                            orderBy: { orderIndex: 'asc' },
                            select: {
                                id: true,
                                text: true,
                                choices: true,
                                orderIndex: true,
                            },
                        },
                    },
                },
            },
        });
    }

    /**
     * Submit/update answers for an attempt.
     */
    async submitAttempt(attemptId: string, userId: string, data: {
        answers: Record<string, string>;
        timeSpent?: number;
        autoSubmitted?: boolean;
    }) {
        const attempt = await prisma.attempt.findUnique({
            where: { id: attemptId },
            include: {
                exam: {
                    include: {
                        questions: true,
                    },
                },
            },
        });

        if (!attempt) throw ApiError.notFound('Attempt not found');
        if (attempt.userId !== userId) throw ApiError.forbidden('Not your attempt');
        if (attempt.status !== 'IN_PROGRESS') throw ApiError.badRequest('Attempt already submitted');

        // Calculate score
        const questions = attempt.exam.questions;
        let correctCount = 0;
        for (const question of questions) {
            if (data.answers[question.id] === question.correctAnswer) {
                correctCount++;
            }
        }

        const percentage = questions.length > 0 ? (correctCount / questions.length) * 100 : 0;

        return prisma.attempt.update({
            where: { id: attemptId },
            data: {
                answers: data.answers,
                score: correctCount,
                percentage: Math.round(percentage * 100) / 100,
                timeSpent: data.timeSpent,
                status: data.autoSubmitted ? 'AUTO_SUBMITTED' : 'COMPLETED',
                completedAt: new Date(),
            },
            include: {
                exam: {
                    select: { id: true, title: true, subject: true, totalItems: true, timeLimit: true },
                },
            },
        });
    }

    /**
     * Get user's attempt history.
     */
    async listAttempts(params: {
        userId?: string;
        examId?: string;
        page?: number;
        limit?: number;
    }) {
        const page = params.page || 1;
        const limit = params.limit || 20;
        const skip = (page - 1) * limit;

        const where: any = {};
        if (params.userId) where.userId = params.userId;
        if (params.examId) where.examId = params.examId;

        const [attempts, total] = await Promise.all([
            prisma.attempt.findMany({
                where,
                include: {
                    exam: { select: { id: true, title: true, subject: true, totalItems: true } },
                    user: { select: { id: true, name: true, email: true } },
                },
                skip,
                take: limit,
                orderBy: { startedAt: 'desc' },
            }),
            prisma.attempt.count({ where }),
        ]);

        return { attempts, total, page, limit };
    }

    /**
     * Get a specific attempt with full review data (including correct answers and explanations).
     */
    async getAttemptReview(attemptId: string, userId: string, isAdmin = false) {
        const attempt = await prisma.attempt.findUnique({
            where: { id: attemptId },
            include: {
                exam: {
                    include: {
                        questions: {
                            orderBy: { orderIndex: 'asc' },
                        },
                    },
                },
                user: { select: { id: true, name: true, email: true } },
            },
        });

        if (!attempt) throw ApiError.notFound('Attempt not found');
        if (!isAdmin && attempt.userId !== userId) {
            throw ApiError.forbidden('Not your attempt');
        }

        return attempt;
    }
}

export const attemptService = new AttemptService();
