import prisma from '../config/db';
import { ApiError } from '../utils/ApiError';
import { notificationService } from './notification.service';

export class AttemptService {
    private normalizeExam(exam: any) {
        return {
            id: exam.id,
            title: exam.title,
            subject: exam.subject,
            timeLimit: exam.timeLimitMinutes,
            timeLimitMinutes: exam.timeLimitMinutes,
            totalItems: exam.questions?.length ?? 0,
        };
    }

    private normalizeUser(user: any) {
        return {
            id: user.id,
            email: user.email,
            name: `${user.firstName} ${user.lastName}`.trim(),
        };
    }

    /**
     * Start a new exam attempt.
     */
    async startAttempt(userId: string, examId: string) {
        const exam = await prisma.exam.findUnique({
            where: { id: examId },
            include: {
                questions: {
                    orderBy: { orderNo: 'asc' },
                    select: {
                        id: true,
                        orderNo: true,
                        questionText: true,
                        choiceA: true,
                        choiceB: true,
                        choiceC: true,
                        choiceD: true,
                    },
                },
            },
        });

        if (!exam) throw ApiError.notFound('Exam not found');
        if (exam.status !== 'PUBLISHED') throw ApiError.forbidden('Exam is not published');

        const existing = await prisma.attempt.findFirst({
            where: { userId, examId, status: 'IN_PROGRESS' },
            include: {
                exam: {
                    include: {
                        questions: {
                            orderBy: { orderNo: 'asc' },
                        },
                    },
                },
                answers: true,
            },
        });

        if (existing) {
            return {
                ...existing,
                answers: Object.fromEntries(existing.answers.map((a) => [a.questionId, a.selectedChoice])),
            };
        }

        const latestAttempt = await prisma.attempt.findFirst({
            where: { userId, examId },
            orderBy: { attemptNo: 'desc' },
        });

        const nextAttemptNo = (latestAttempt?.attemptNo || 0) + 1;

        if (exam.maxAttempts !== null && exam.maxAttempts !== undefined && nextAttemptNo > exam.maxAttempts) {
            throw ApiError.forbidden(`Maximum attempts reached (${exam.maxAttempts})`);
        }

        if (exam.cooldownMinutes > 0 && latestAttempt?.submittedAt) {
            const lastSubmissionTime = new Date(latestAttempt.submittedAt).getTime();
            const cooldownEnd = lastSubmissionTime + exam.cooldownMinutes * 60 * 1000;
            const now = Date.now();

            if (now < cooldownEnd) {
                const waitMinutes = Math.ceil((cooldownEnd - now) / (60 * 1000));
                throw ApiError.forbidden(`Please wait ${waitMinutes} minute(s) before starting a new attempt`);
            }
        }

        return prisma.attempt.create({
            data: {
                userId,
                examId,
                attemptNo: nextAttemptNo,
                status: 'IN_PROGRESS',
                lastSavedAt: new Date(),
                remainingSeconds: exam.timeLimitMinutes * 60,
            },
            include: {
                exam: {
                    include: {
                        questions: {
                            orderBy: { orderNo: 'asc' },
                            select: {
                                id: true,
                                orderNo: true,
                                questionText: true,
                                choiceA: true,
                                choiceB: true,
                                choiceC: true,
                                choiceD: true,
                            },
                        },
                    },
                },
                answers: true,
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
        remainingSeconds?: number;
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

        let correctCount = 0;
        for (const question of attempt.exam.questions) {
            if (data.answers[question.id] === question.correctChoice) {
                correctCount++;
            }
        }

        const percentage = attempt.exam.questions.length > 0
            ? (correctCount / attempt.exam.questions.length) * 100
            : 0;

        await prisma.$transaction(async (tx) => {
            const answerRows = Object.entries(data.answers || {});
            for (const [questionId, selectedChoice] of answerRows) {
                const question = attempt.exam.questions.find((q) => q.id === questionId);
                if (!question) continue;

                await tx.attemptAnswer.upsert({
                    where: {
                        attemptId_questionId: {
                            attemptId,
                            questionId,
                        },
                    },
                    update: {
                        selectedChoice,
                        isCorrect: selectedChoice === question.correctChoice,
                        answeredAt: new Date(),
                    },
                    create: {
                        attemptId,
                        questionId,
                        selectedChoice,
                        isCorrect: selectedChoice === question.correctChoice,
                        answeredAt: new Date(),
                    },
                });
            }

            await tx.attempt.update({
                where: { id: attemptId },
                data: {
                    score: correctCount,
                    percentage: Math.round(percentage * 100) / 100,
                    timeSpentSeconds: data.timeSpent,
                    submissionType: data.autoSubmitted ? 'AUTO' : 'MANUAL',
                    status: 'SUBMITTED',
                    submittedAt: new Date(),
                    lastSavedAt: new Date(),
                    remainingSeconds: data.remainingSeconds,
                },
            });
        });

        if (data.autoSubmitted) {
            await notificationService.createNotification({
                recipientUserId: attempt.userId,
                type: 'EXAM_AUTO_SUBMITTED',
                title: 'Exam Auto-Submitted',
                message: `Your attempt for \"${attempt.exam.title}\" was automatically submitted when time expired.`,
                link: `/exam-results/${attemptId}`,
                entityType: 'attempt',
                entityId: attemptId,
                severity: 'WARNING',
            });
        }

        const submittedAttempt = await prisma.attempt.findUnique({
            where: { id: attemptId },
            include: {
                exam: { include: { questions: true } },
                answers: true,
            },
        });

        return {
            ...submittedAttempt,
            exam: this.normalizeExam(submittedAttempt?.exam),
            answers: Object.fromEntries((submittedAttempt?.answers || []).map((a) => [a.questionId, a.selectedChoice])),
        };
    }

    async saveAttempt(attemptId: string, userId: string, data: {
        answers?: Record<string, string>;
        timeSpent?: number;
        remainingSeconds?: number;
    }) {
        const attempt = await prisma.attempt.findUnique({
            where: { id: attemptId },
            include: { exam: { include: { questions: true } } },
        });

        if (!attempt) throw ApiError.notFound('Attempt not found');
        if (attempt.userId !== userId) throw ApiError.forbidden('Not your attempt');
        if (attempt.status !== 'IN_PROGRESS') throw ApiError.badRequest('Cannot save a submitted attempt');

        await prisma.$transaction(async (tx) => {
            if (data.answers) {
                const answerRows = Object.entries(data.answers);
                for (const [questionId, selectedChoice] of answerRows) {
                    const question = attempt.exam.questions.find((q) => q.id === questionId);
                    if (!question) continue;

                    await tx.attemptAnswer.upsert({
                        where: {
                            attemptId_questionId: {
                                attemptId,
                                questionId,
                            },
                        },
                        update: {
                            selectedChoice,
                            isCorrect: selectedChoice === question.correctChoice,
                            answeredAt: new Date(),
                        },
                        create: {
                            attemptId,
                            questionId,
                            selectedChoice,
                            isCorrect: selectedChoice === question.correctChoice,
                            answeredAt: new Date(),
                        },
                    });
                }
            }

            await tx.attempt.update({
                where: { id: attemptId },
                data: {
                    timeSpentSeconds: data.timeSpent ?? attempt.timeSpentSeconds,
                    remainingSeconds: data.remainingSeconds ?? attempt.remainingSeconds,
                    lastSavedAt: new Date(),
                },
            });
        });

        const savedAttempt = await prisma.attempt.findUnique({
            where: { id: attemptId },
            include: {
                exam: { include: { questions: true } },
                answers: true,
            },
        });

        return {
            ...savedAttempt,
            exam: this.normalizeExam(savedAttempt?.exam),
            answers: Object.fromEntries((savedAttempt?.answers || []).map((a) => [a.questionId, a.selectedChoice])),
        };
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
                    exam: { select: { id: true, title: true, subject: true, timeLimitMinutes: true } },
                    user: { select: { id: true, firstName: true, lastName: true, email: true } },
                    answers: true,
                },
                skip,
                take: limit,
                orderBy: { startedAt: 'desc' },
            }),
            prisma.attempt.count({ where }),
        ]);

        return {
            attempts: attempts.map((attempt) => ({
                ...attempt,
                exam: this.normalizeExam({ ...attempt.exam, questions: new Array(0) }),
                user: this.normalizeUser(attempt.user),
                answers: Object.fromEntries(attempt.answers.map((a) => [a.questionId, a.selectedChoice])),
            })),
            total,
            page,
            limit,
        };
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
                            orderBy: { orderNo: 'asc' },
                        },
                    },
                },
                user: { select: { id: true, firstName: true, lastName: true, email: true } },
                answers: true,
            },
        });

        if (!attempt) throw ApiError.notFound('Attempt not found');
        if (!isAdmin && attempt.userId !== userId) {
            throw ApiError.forbidden('Not your attempt');
        }

        return {
            ...attempt,
            user: this.normalizeUser(attempt.user),
            answers: Object.fromEntries(attempt.answers.map((a) => [a.questionId, a.selectedChoice])),
        };
    }
}

export const attemptService = new AttemptService();
