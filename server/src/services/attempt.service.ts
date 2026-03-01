import prisma from '../config/db';
import { ApiError } from '../utils/ApiError';
import { notificationService } from './notification.service';

export class AttemptService {
    private readonly validChoices = new Set(['A', 'B', 'C', 'D']);

    private async closeExamIfExpired(examId: string) {
        await prisma.exam.updateMany({
            where: {
                id: examId,
                status: 'LIVE',
                closeOnDeadline: true,
                scheduleEnd: {
                    lte: new Date(),
                },
            },
            data: {
                status: 'CLOSED',
            },
        });
    }

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
            programTrack: user.programTrack || null,
            profilePicture: user.profilePicture || null,
        };
    }

    private normalizeAttemptQuestions(questions: any[]) {
        return (questions || []).map((question) => ({
            id: question.id,
            orderNo: question.orderNo,
            text: question.questionText,
            imageUrl: question.imageUrl || null,
            choices: [question.choiceA, question.choiceB, question.choiceC, question.choiceD],
            section: question.section?.title || null,
            sectionId: question.section?.id || null,
        }));
    }

    private normalizeAttemptPayload(attempt: any) {
        const answersMap = Object.fromEntries((attempt.answers || []).map((answer: any) => [answer.questionId, answer.selectedChoice]));

        return {
            id: attempt.id,
            examId: attempt.examId,
            userId: attempt.userId,
            attemptNo: attempt.attemptNo,
            status: attempt.status,
            startedAt: attempt.startedAt,
            submittedAt: attempt.submittedAt,
            lastSavedAt: attempt.lastSavedAt,
            remainingSeconds: attempt.remainingSeconds,
            timeSpentSeconds: attempt.timeSpentSeconds,
            score: attempt.score,
            percentage: Number(attempt.percentage || 0),
            submissionType: attempt.submissionType,
            exam: {
                ...this.normalizeExam(attempt.exam),
                questions: this.normalizeAttemptQuestions(attempt.exam?.questions || []),
            },
            answers: answersMap,
        };
    }

    private validateAnswerChoices(answers: Record<string, string>) {
        for (const [questionId, selectedChoiceRaw] of Object.entries(answers || {})) {
            const selectedChoice = String(selectedChoiceRaw || '').trim().toUpperCase();
            if (!questionId || !this.validChoices.has(selectedChoice)) {
                throw ApiError.badRequest('Answers contain invalid question IDs or choices');
            }
        }
    }

    /**
     * Start a new exam attempt.
     */
    async startAttempt(userId: string, examId: string) {
        await this.closeExamIfExpired(examId);

        const exam = await prisma.exam.findUnique({
            where: { id: examId },
            include: {
                questions: {
                    orderBy: { orderNo: 'asc' },
                    select: {
                        id: true,
                        orderNo: true,
                        questionText: true,
                        imageUrl: true,
                        choiceA: true,
                        choiceB: true,
                        choiceC: true,
                        choiceD: true,
                    },
                },
            },
        });

        if (!exam) throw ApiError.notFound('Exam not found');
        if (exam.status !== 'LIVE') throw ApiError.forbidden('Exam is not currently live');

        const lockKey = `attempt:${userId}:${examId}`;

        return prisma.$transaction(async (tx) => {
            await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;

            const submittedAttempt = await tx.attempt.findFirst({
                where: {
                    userId,
                    examId,
                    status: 'SUBMITTED',
                },
                select: { id: true },
            });

            if (submittedAttempt) {
                throw ApiError.forbidden('You can only submit this mock exam once');
            }

            const existing = await tx.attempt.findFirst({
                where: { userId, examId, status: 'IN_PROGRESS' },
                include: {
                    exam: {
                        include: {
                            questions: {
                                orderBy: { orderNo: 'asc' },
                                include: {
                                    section: {
                                        select: {
                                            id: true,
                                            title: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                    answers: true,
                },
            });

            if (existing) {
                return this.normalizeAttemptPayload(existing);
            }

            const latestAttempt = await tx.attempt.findFirst({
                where: { userId, examId },
                orderBy: { attemptNo: 'desc' },
            });

            const effectiveMaxAttempts = exam.maxAttempts ?? 1;
            const nextAttemptNo = (latestAttempt?.attemptNo || 0) + 1;

            if (nextAttemptNo > effectiveMaxAttempts) {
                throw ApiError.forbidden(`Maximum attempts reached (${effectiveMaxAttempts})`);
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

            const createdAttempt = await tx.attempt.create({
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
                                    imageUrl: true,
                                    choiceA: true,
                                    choiceB: true,
                                    choiceC: true,
                                    choiceD: true,
                                    section: {
                                        select: {
                                            id: true,
                                            title: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                    answers: true,
                },
            });

            return this.normalizeAttemptPayload(createdAttempt);
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
        this.validateAnswerChoices(data.answers || {});

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
        await this.closeExamIfExpired(attempt.examId);

        const refreshedAttempt = await prisma.attempt.findUnique({
            where: { id: attemptId },
            include: {
                exam: {
                    include: {
                        questions: true,
                    },
                },
            },
        });

        if (!refreshedAttempt) throw ApiError.notFound('Attempt not found');

        if (refreshedAttempt.userId !== userId) throw ApiError.forbidden('Not your attempt');
        if (refreshedAttempt.status !== 'IN_PROGRESS') throw ApiError.badRequest('Attempt already submitted');
        if (refreshedAttempt.exam.status === 'CLOSED') throw ApiError.forbidden('Submissions are closed for this exam');
        if (refreshedAttempt.exam.status !== 'LIVE') throw ApiError.forbidden('This exam is not accepting submissions');

        if (refreshedAttempt.exam.scheduleEnd && new Date(refreshedAttempt.exam.scheduleEnd).getTime() < Date.now()) {
            throw ApiError.forbidden('Submission window has ended for this exam');
        }

        let correctCount = 0;
        for (const question of refreshedAttempt.exam.questions) {
            const normalizedChoice = String(data.answers[question.id] || '').toUpperCase();
            if (normalizedChoice === question.correctChoice) {
                correctCount++;
            }
        }

        const percentage = refreshedAttempt.exam.questions.length > 0
            ? (correctCount / refreshedAttempt.exam.questions.length) * 100
            : 0;

        await prisma.$transaction(async (tx) => {
            const answerRows = Object.entries(data.answers || {});
            for (const [questionId, selectedChoice] of answerRows) {
                const question = refreshedAttempt.exam.questions.find((q) => q.id === questionId);
                if (!question) continue;
                const normalizedChoice = String(selectedChoice || '').trim().toUpperCase();
                if (!this.validChoices.has(normalizedChoice)) continue;

                await tx.attemptAnswer.upsert({
                    where: {
                        attemptId_questionId: {
                            attemptId,
                            questionId,
                        },
                    },
                    update: {
                        selectedChoice: normalizedChoice,
                        isCorrect: normalizedChoice === question.correctChoice,
                        answeredAt: new Date(),
                    },
                    create: {
                        attemptId,
                        questionId,
                        selectedChoice: normalizedChoice,
                        isCorrect: normalizedChoice === question.correctChoice,
                        answeredAt: new Date(),
                    },
                });
            }

            await tx.attempt.update({
                where: { id: attemptId },
                data: {
                    score: correctCount,
                    percentage: Math.round(percentage * 100) / 100,
                    timeSpentSeconds: Math.max(0, data.timeSpent || 0),
                    submissionType: data.autoSubmitted ? 'AUTO' : 'MANUAL',
                    status: 'SUBMITTED',
                    submittedAt: new Date(),
                    lastSavedAt: new Date(),
                    remainingSeconds: Math.max(0, data.remainingSeconds || 0),
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
        if (data.answers) {
            this.validateAnswerChoices(data.answers);
        }

        const attempt = await prisma.attempt.findUnique({
            where: { id: attemptId },
            include: { exam: { include: { questions: true } } },
        });

        if (!attempt) throw ApiError.notFound('Attempt not found');
        await this.closeExamIfExpired(attempt.examId);

        const latestAttempt = await prisma.attempt.findUnique({
            where: { id: attemptId },
            include: { exam: { include: { questions: true } } },
        });

        if (!latestAttempt) throw ApiError.notFound('Attempt not found');
        if (latestAttempt.exam.status === 'CLOSED') throw ApiError.forbidden('This exam is already closed');
        if (latestAttempt.exam.status !== 'LIVE') throw ApiError.forbidden('This exam is not accepting saves right now');

        if (attempt.userId !== userId) throw ApiError.forbidden('Not your attempt');
        if (attempt.status !== 'IN_PROGRESS') throw ApiError.badRequest('Cannot save a submitted attempt');

        await prisma.$transaction(async (tx) => {
            if (data.answers) {
                const answerRows = Object.entries(data.answers);
                for (const [questionId, selectedChoice] of answerRows) {
                    const question = latestAttempt.exam.questions.find((q) => q.id === questionId);
                    if (!question) continue;
                    const normalizedChoice = String(selectedChoice || '').trim().toUpperCase();
                    if (!this.validChoices.has(normalizedChoice)) continue;

                    await tx.attemptAnswer.upsert({
                        where: {
                            attemptId_questionId: {
                                attemptId,
                                questionId,
                            },
                        },
                        update: {
                            selectedChoice: normalizedChoice,
                            isCorrect: normalizedChoice === question.correctChoice,
                            answeredAt: new Date(),
                        },
                        create: {
                            attemptId,
                            questionId,
                            selectedChoice: normalizedChoice,
                            isCorrect: normalizedChoice === question.correctChoice,
                            answeredAt: new Date(),
                        },
                    });
                }
            }

            await tx.attempt.update({
                where: { id: attemptId },
                data: {
                    timeSpentSeconds: Math.max(0, data.timeSpent ?? latestAttempt.timeSpentSeconds),
                    remainingSeconds: Math.max(0, data.remainingSeconds ?? latestAttempt.remainingSeconds ?? 0),
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

    async getAttemptResult(attemptId: string, userId: string, isAdmin = false) {
        const attempt = await prisma.attempt.findUnique({
            where: { id: attemptId },
            include: {
                exam: {
                    include: {
                        questions: {
                            orderBy: { orderNo: 'asc' },
                            include: {
                                section: {
                                    select: {
                                        id: true,
                                        title: true,
                                    },
                                },
                            },
                        },
                    },
                },
                answers: true,
            },
        });

        if (!attempt) throw ApiError.notFound('Attempt not found');
        if (!isAdmin && attempt.userId !== userId) {
            throw ApiError.forbidden('Not your attempt');
        }
        if (attempt.status !== 'SUBMITTED') {
            throw ApiError.badRequest('Result is only available after submission');
        }

        const answersMap = Object.fromEntries((attempt.answers || []).map((answer) => [answer.questionId, answer.selectedChoice]));
        const questions = attempt.exam.questions || [];
        const totalQuestions = questions.length;
        const correct = questions.filter((question) => answersMap[question.id] === question.correctChoice).length;
        const answered = Object.keys(answersMap).length;
        const incorrect = Math.max(answered - correct, 0);
        const skipped = Math.max(totalQuestions - answered, 0);

        const sectionBuckets = new Map<string, { sectionId: string | null; name: string; total: number; correct: number; answered: number }>();

        for (const question of questions) {
            const sectionName = question.section?.title || 'General Section';
            const bucketKey = question.section?.id || sectionName;

            if (!sectionBuckets.has(bucketKey)) {
                sectionBuckets.set(bucketKey, {
                    sectionId: question.section?.id || null,
                    name: sectionName,
                    total: 0,
                    correct: 0,
                    answered: 0,
                });
            }

            const bucket = sectionBuckets.get(bucketKey)!;
            const userChoice = answersMap[question.id];
            const isAnswered = Boolean(userChoice);
            const isCorrect = userChoice === question.correctChoice;

            bucket.total += 1;
            bucket.answered += isAnswered ? 1 : 0;
            bucket.correct += isCorrect ? 1 : 0;
        }

        const sections = Array.from(sectionBuckets.values()).map((section) => {
            const incorrectInSection = Math.max(section.answered - section.correct, 0);
            const skippedInSection = Math.max(section.total - section.answered, 0);

            return {
                ...section,
                incorrect: incorrectInSection,
                skipped: skippedInSection,
                score: section.total > 0 ? Math.round((section.correct / section.total) * 10000) / 100 : 0,
            };
        });

        const questionDetails = questions.map((question) => {
            const userChoice = String(answersMap[question.id] || '').trim().toUpperCase();
            const correctChoice = String(question.correctChoice || '').trim().toUpperCase();
            const isCorrect = Boolean(userChoice) && userChoice === correctChoice;

            return {
                id: question.id,
                orderNo: question.orderNo,
                section: question.section?.title || 'General Section',
                questionText: question.questionText,
                imageUrl: question.imageUrl || null,
                choices: [question.choiceA, question.choiceB, question.choiceC, question.choiceD],
                userChoice: userChoice || null,
                correctChoice: correctChoice || null,
                isCorrect,
                rationalization: question.rationalization || null,
            };
        });

        return {
            id: attempt.id,
            examId: attempt.examId,
            status: attempt.status,
            attemptNo: attempt.attemptNo,
            submittedAt: attempt.submittedAt,
            timeSpentSeconds: attempt.timeSpentSeconds,
            remainingSeconds: attempt.remainingSeconds,
            score: attempt.score,
            percentage: Number(attempt.percentage || 0),
            submissionType: attempt.submissionType,
            exam: this.normalizeExam(attempt.exam),
            stats: {
                totalQuestions,
                correct,
                incorrect,
                skipped,
                answered,
                accuracy: totalQuestions > 0 ? Math.round((correct / totalQuestions) * 10000) / 100 : 0,
            },
            sections,
            questionDetails,
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
                    user: { select: { id: true, firstName: true, lastName: true, email: true, programTrack: true, profilePicture: true } },
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
                            include: {
                                section: {
                                    select: {
                                        id: true,
                                        title: true,
                                    },
                                },
                            },
                        },
                    },
                },
                user: { select: { id: true, firstName: true, lastName: true, email: true, programTrack: true, profilePicture: true } },
                answers: true,
            },
        });

        if (!attempt) throw ApiError.notFound('Attempt not found');
        if (!isAdmin && attempt.userId !== userId) {
            throw ApiError.forbidden('Not your attempt');
        }
        if (!isAdmin && attempt.status !== 'SUBMITTED') {
            throw ApiError.badRequest('Review is only available after submission');
        }

        return {
            ...attempt,
            exam: {
                ...attempt.exam,
                questions: (attempt.exam?.questions || []).map((q: any) => ({
                    ...q,
                    section: q.section?.title || null,
                    sectionId: q.section?.id || q.sectionId || null,
                })),
            },
            user: this.normalizeUser(attempt.user),
            answers: Object.fromEntries(attempt.answers.map((a) => [a.questionId, a.selectedChoice])),
        };
    }
}

export const attemptService = new AttemptService();
