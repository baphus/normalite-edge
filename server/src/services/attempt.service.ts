import prisma from '../config/db';
import { ApiError } from '../utils/ApiError';
import { notificationService } from './notification.service';

export class AttemptService {
    private readonly validChoices = new Set(['A', 'B', 'C', 'D']);
    private readonly defaultMultipleAttemptsLimit = 3;
    private readonly defaultSectionTitle = 'Main section';

    private async getSystemSettings() {
        try {
            const rows = await prisma.$queryRaw<Array<{
                allow_multiple_attempts: boolean;
                enforce_exam_single_tab: boolean;
                tab_switch_grace_seconds: number;
            }>>`
                SELECT allow_multiple_attempts, enforce_exam_single_tab, tab_switch_grace_seconds
                FROM system_settings
                WHERE id = 1
                LIMIT 1
            `;

            if (rows.length > 0) {
                return {
                    allowMultipleAttempts: Boolean(rows[0].allow_multiple_attempts),
                    enforceExamSingleTab: Boolean(rows[0].enforce_exam_single_tab),
                    tabSwitchGraceSeconds: Math.max(1, Math.min(30, Math.round(Number(rows[0].tab_switch_grace_seconds || 5)))),
                };
            }

            await prisma.$executeRaw`
                INSERT INTO system_settings (id, allow_multiple_attempts, enforce_exam_single_tab, tab_switch_grace_seconds)
                VALUES (1, false, false, 5)
                ON CONFLICT (id) DO NOTHING
            `;

            return {
                allowMultipleAttempts: false,
                enforceExamSingleTab: false,
                tabSwitchGraceSeconds: 5,
            };
        } catch (error) {
            console.error('Failed to read system settings, defaulting to safe values', error);
            return {
                allowMultipleAttempts: false,
                enforceExamSingleTab: false,
                tabSwitchGraceSeconds: 5,
            };
        }
    }

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

    private computeRemainingSeconds(endsAt: Date) {
        return Math.max(0, Math.floor((endsAt.getTime() - Date.now()) / 1000));
    }

    private computeTimeSpentSeconds(startedAt: Date, endsAt: Date) {
        const cappedNow = Math.min(Date.now(), endsAt.getTime());
        return Math.max(0, Math.round((cappedNow - startedAt.getTime()) / 1000));
    }

    private clampCurrentQuestionIndex(currentQuestionIndex: unknown, questionCount: number) {
        const numeric = Number(currentQuestionIndex);
        if (!Number.isFinite(numeric)) return null;

        const rounded = Math.round(numeric);
        if (rounded < 0) return 0;
        if (questionCount <= 0) return 0;

        return Math.min(rounded, Math.max(questionCount - 1, 0));
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
            campus: user.campus?.name || null,
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
            section: question.section?.title || this.defaultSectionTitle,
            sectionId: question.section?.id || null,
        }));
    }

    private normalizeAttemptPayload(
        attempt: any,
        options?: { enforceExamSingleTab?: boolean; tabSwitchGraceSeconds?: number },
    ) {
        const computedRemainingSeconds = attempt.status === 'IN_PROGRESS'
            ? this.computeRemainingSeconds(attempt.endsAt)
            : Math.max(0, Number(attempt.remainingSeconds || 0));
        const answersMap = Object.fromEntries((attempt.answers || []).map((answer: any) => [answer.questionId, answer.selectedChoice]));
        const answerMeta = Object.fromEntries((attempt.answers || []).map((answer: any) => [
            answer.questionId,
            {
                viewedAt: answer.viewedAt ? answer.viewedAt.toISOString() : null,
                answeredAt: answer.answeredAt ? answer.answeredAt.toISOString() : null,
                elapsedSeconds: typeof answer.elapsedSeconds === 'number' ? answer.elapsedSeconds : null,
            },
        ]));

        return {
            id: attempt.id,
            examId: attempt.examId,
            userId: attempt.userId,
            attemptNo: attempt.attemptNo,
            status: attempt.status,
            startedAt: attempt.startedAt,
            endsAt: attempt.endsAt,
            submittedAt: attempt.submittedAt,
            lastSavedAt: attempt.lastSavedAt,
            lastActivityAt: attempt.lastActivityAt,
            currentQuestionIndex: attempt.currentQuestionIndex,
            remainingSeconds: computedRemainingSeconds,
            timeSpentSeconds: attempt.timeSpentSeconds,
            score: attempt.score,
            percentage: Number(attempt.percentage || 0),
            submissionType: attempt.submissionType,
            exam: {
                ...this.normalizeExam(attempt.exam),
                questions: this.normalizeAttemptQuestions(attempt.exam?.questions || []),
            },
            answers: answersMap,
            answerMeta,
            enforceExamSingleTab: Boolean(options?.enforceExamSingleTab),
            tabSwitchGraceSeconds: Math.max(1, Math.min(30, Math.round(Number(options?.tabSwitchGraceSeconds || 5)))),
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

    private parseClientAnsweredAt(raw: unknown, startedAt: Date) {
        if (typeof raw !== 'string' || !raw.trim()) return null;

        const parsed = new Date(raw);
        if (Number.isNaN(parsed.getTime())) return null;

        const startedAtMs = startedAt.getTime() - 5000;
        const nowMs = Date.now() + 5000;
        const parsedMs = parsed.getTime();

        if (parsedMs < startedAtMs || parsedMs > nowMs) return null;
        return parsed;
    }

    private parseClientViewedAt(raw: unknown, startedAt: Date) {
        if (typeof raw !== 'string' || !raw.trim()) return null;

        const parsed = new Date(raw);
        if (Number.isNaN(parsed.getTime())) return null;

        const startedAtMs = startedAt.getTime() - 5000;
        const nowMs = Date.now() + 5000;
        const parsedMs = parsed.getTime();

        if (parsedMs < startedAtMs || parsedMs > nowMs) return null;
        return parsed;
    }

    private parseClientElapsedSeconds(raw: unknown) {
        const numeric = Number(raw);
        if (!Number.isFinite(numeric)) return null;

        const rounded = Math.round(numeric);
        if (rounded < 0) return null;

        return rounded;
    }

    private resolveElapsedSeconds(
        existingAnswer: { elapsedSeconds?: number | null } | undefined,
        clientElapsedSeconds: number | null,
    ) {
        const currentElapsed = typeof existingAnswer?.elapsedSeconds === 'number'
            ? Math.max(0, Math.round(existingAnswer.elapsedSeconds))
            : null;

        if (typeof clientElapsedSeconds === 'number') {
            return currentElapsed !== null
                ? Math.max(currentElapsed, clientElapsedSeconds)
                : clientElapsedSeconds;
        }

        return currentElapsed;
    }

    private resolveViewedAt(
        existingAnswer: { viewedAt?: Date | null } | undefined,
        clientViewedAt: Date | null,
    ) {
        if (existingAnswer?.viewedAt) return existingAnswer.viewedAt;
        return clientViewedAt;
    }

    private async autoSubmitExpiredAttempt(attemptId: string) {
        const attempt = await prisma.attempt.findUnique({
            where: { id: attemptId },
            include: {
                exam: { include: { questions: true } },
                answers: true,
            },
        });

        if (!attempt) {
            throw ApiError.notFound('Attempt not found');
        }

        if (attempt.status !== 'IN_PROGRESS') {
            return attempt;
        }

        const answersByQuestionId = new Map(attempt.answers.map((answer) => [answer.questionId, answer]));
        const correctCount = attempt.exam.questions.reduce((sum, question) => {
            const answer = answersByQuestionId.get(question.id);
            if (!answer) {
                return sum;
            }

            const isCorrect = String(answer.selectedChoice || '').toUpperCase() === String(question.correctChoice || '').toUpperCase();
            return sum + (isCorrect ? 1 : 0);
        }, 0);
        const percentage = attempt.exam.questions.length > 0
            ? (correctCount / attempt.exam.questions.length) * 100
            : 0;

        await prisma.$transaction(async (tx) => {
            for (const answer of attempt.answers) {
                const question = attempt.exam.questions.find((q) => q.id === answer.questionId);
                if (!question) continue;

                await tx.attemptAnswer.update({
                    where: { id: answer.id },
                    data: {
                        isCorrect: String(answer.selectedChoice || '').toUpperCase() === String(question.correctChoice || '').toUpperCase(),
                    },
                });
            }

            await tx.attempt.update({
                where: { id: attempt.id },
                data: {
                    status: 'SUBMITTED',
                    submissionType: 'AUTO',
                    submittedAt: new Date(),
                    lastSavedAt: new Date(),
                    lastActivityAt: new Date(),
                    score: correctCount,
                    percentage: Math.round(percentage * 100) / 100,
                    remainingSeconds: 0,
                    timeSpentSeconds: this.computeTimeSpentSeconds(attempt.startedAt, attempt.endsAt),
                },
            });
        });

        const finalizedAttempt = await prisma.attempt.findUnique({
            where: { id: attempt.id },
            include: {
                exam: { include: { questions: true } },
                answers: true,
            },
        });

        if (!finalizedAttempt) {
            throw ApiError.notFound('Attempt not found');
        }

        return finalizedAttempt;
    }

    private resolveAnsweredAt(
        existingAnswer: { selectedChoice: string; answeredAt: Date | null } | undefined,
        normalizedChoice: string,
        clientAnsweredAt: Date | null,
    ) {
        if (
            existingAnswer
            && existingAnswer.selectedChoice === normalizedChoice
            && existingAnswer.answeredAt
        ) {
            return existingAnswer.answeredAt;
        }

        return clientAnsweredAt || new Date();
    }

    /**
     * Start a new exam attempt.
     */
    async startAttempt(userId: string, examId: string) {
        await this.closeExamIfExpired(examId);
        const settings = await this.getSystemSettings();
        const allowMultipleAttempts = settings.allowMultipleAttempts;

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

            if (!allowMultipleAttempts && submittedAttempt) {
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
                if (this.computeRemainingSeconds(existing.endsAt) <= 0) {
                    const expiredSubmission = await this.autoSubmitExpiredAttempt(existing.id);
                    return this.normalizeAttemptPayload(expiredSubmission, {
                        enforceExamSingleTab: settings.enforceExamSingleTab,
                        tabSwitchGraceSeconds: settings.tabSwitchGraceSeconds,
                    });
                }

                return this.normalizeAttemptPayload(existing, {
                    enforceExamSingleTab: settings.enforceExamSingleTab,
                    tabSwitchGraceSeconds: settings.tabSwitchGraceSeconds,
                });
            }

            const latestAttempt = await tx.attempt.findFirst({
                where: { userId, examId },
                orderBy: { attemptNo: 'desc' },
            });

            const effectiveMaxAttempts = allowMultipleAttempts
                ? (exam.maxAttempts ?? this.defaultMultipleAttemptsLimit)
                : 1;
            const nextAttemptNo = (latestAttempt?.attemptNo || 0) + 1;

            if (effectiveMaxAttempts && nextAttemptNo > effectiveMaxAttempts) {
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
                    endsAt: new Date(Date.now() + exam.timeLimitMinutes * 60 * 1000),
                    lastSavedAt: new Date(),
                    lastActivityAt: new Date(),
                    currentQuestionIndex: 0,
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

            return this.normalizeAttemptPayload(createdAttempt, {
                enforceExamSingleTab: settings.enforceExamSingleTab,
                tabSwitchGraceSeconds: settings.tabSwitchGraceSeconds,
            });
        });
    }

    async resetAttemptForTabViolation(attemptId: string, userId: string) {
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
        if (attempt.userId !== userId) throw ApiError.forbidden('Not your attempt');
        if (attempt.status !== 'IN_PROGRESS') throw ApiError.badRequest('Cannot reset a submitted attempt');

        await this.closeExamIfExpired(attempt.examId);

        const refreshed = await prisma.attempt.findUnique({
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

        if (!refreshed) throw ApiError.notFound('Attempt not found');
        if (refreshed.exam.status !== 'LIVE') {
            throw ApiError.forbidden('This exam is not accepting resets right now');
        }

        await prisma.$transaction(async (tx) => {
            await tx.attemptAnswer.deleteMany({ where: { attemptId } });

            await tx.attempt.update({
                where: { id: attemptId },
                data: {
                    lastSavedAt: new Date(),
                    lastActivityAt: new Date(),
                    currentQuestionIndex: 0,
                    score: 0,
                    percentage: 0,
                    submissionType: 'MANUAL',
                    submittedAt: null,
                    remainingSeconds: this.computeRemainingSeconds(refreshed.endsAt),
                },
            });
        });

        const resetAttempt = await prisma.attempt.findUnique({
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

        return this.normalizeAttemptPayload(resetAttempt);
    }

    /**
     * Submit/update answers for an attempt.
     */
    async submitAttempt(attemptId: string, userId: string, data: {
        answers: Record<string, string>;
        answerMeta?: Record<string, { viewedAt?: string | null; answeredAt?: string | null; elapsedSeconds?: number | null }>;
        currentQuestionIndex?: number;
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
                answers: true,
            },
        });

        if (!refreshedAttempt) throw ApiError.notFound('Attempt not found');

        if (refreshedAttempt.userId !== userId) throw ApiError.forbidden('Not your attempt');
        if (refreshedAttempt.status !== 'IN_PROGRESS') {
            return {
                ...refreshedAttempt,
                exam: this.normalizeExam(refreshedAttempt.exam),
                answers: Object.fromEntries((refreshedAttempt.answers || []).map((a) => [a.questionId, a.selectedChoice])),
            };
        }

        if (this.computeRemainingSeconds(refreshedAttempt.endsAt) <= 0) {
            const finalized = await this.autoSubmitExpiredAttempt(attemptId);
            return {
                ...finalized,
                exam: this.normalizeExam(finalized.exam),
                answers: Object.fromEntries((finalized.answers || []).map((a) => [a.questionId, a.selectedChoice])),
            };
        }

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
                const existingAnswer = refreshedAttempt.answers.find((answer) => answer.questionId === questionId);
                const clientViewedAtRaw = data.answerMeta?.[questionId]?.viewedAt;
                const clientViewedAt = this.parseClientViewedAt(clientViewedAtRaw, refreshedAttempt.startedAt);
                const clientAnsweredAtRaw = data.answerMeta?.[questionId]?.answeredAt;
                const clientAnsweredAt = this.parseClientAnsweredAt(clientAnsweredAtRaw, refreshedAttempt.startedAt);
                const clientElapsedSecondsRaw = data.answerMeta?.[questionId]?.elapsedSeconds;
                const clientElapsedSeconds = this.parseClientElapsedSeconds(clientElapsedSecondsRaw);
                const viewedAt = this.resolveViewedAt(existingAnswer, clientViewedAt);
                const answeredAt = this.resolveAnsweredAt(existingAnswer, normalizedChoice, clientAnsweredAt);
                const elapsedSeconds = this.resolveElapsedSeconds(existingAnswer, clientElapsedSeconds);

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
                        viewedAt,
                        answeredAt,
                        elapsedSeconds,
                    },
                    create: {
                        attemptId,
                        questionId,
                        selectedChoice: normalizedChoice,
                        isCorrect: normalizedChoice === question.correctChoice,
                        viewedAt,
                        answeredAt,
                        elapsedSeconds,
                    },
                });
            }

            const currentQuestionIndex = this.clampCurrentQuestionIndex(
                data.currentQuestionIndex,
                refreshedAttempt.exam.questions.length,
            );

            await tx.attempt.update({
                where: { id: attemptId },
                data: {
                    score: correctCount,
                    percentage: Math.round(percentage * 100) / 100,
                    timeSpentSeconds: this.computeTimeSpentSeconds(refreshedAttempt.startedAt, refreshedAttempt.endsAt),
                    submissionType: data.autoSubmitted ? 'AUTO' : 'MANUAL',
                    status: 'SUBMITTED',
                    submittedAt: new Date(),
                    lastSavedAt: new Date(),
                    lastActivityAt: new Date(),
                    currentQuestionIndex: currentQuestionIndex ?? refreshedAttempt.currentQuestionIndex,
                    remainingSeconds: this.computeRemainingSeconds(refreshedAttempt.endsAt),
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

        const [submitter, adminUsers] = await Promise.all([
            prisma.user.findUnique({
                where: { id: userId },
                select: { firstName: true, lastName: true },
            }),
            prisma.user.findMany({
                where: {
                    role: 'ADMIN',
                    status: 'ACTIVE',
                },
                select: { id: true },
            }),
        ]);

        const submitterName = `${submitter?.firstName || ''} ${submitter?.lastName || ''}`.trim() || 'A reviewee';
        const ownerUserId = refreshedAttempt.exam.createdBy;
        const adminRecipientUserIds = Array.from(new Set(
            adminUsers
                .map((admin) => admin.id)
                .filter((adminId) => adminId !== ownerUserId)
        ));

        await Promise.all([
            notificationService.createNotification({
                recipientUserId: ownerUserId,
                type: 'EXAM_SUBMISSION_RECEIVED',
                title: 'New Submission on Your Mock Exam',
                message: `${submitterName} submitted an attempt to your mock exam "${refreshedAttempt.exam.title}".`,
                link: `/manage-exams/${refreshedAttempt.examId}/submissions`,
                entityType: 'exam',
                entityId: refreshedAttempt.examId,
                severity: 'INFO',
            }),
            notificationService.createNotifications({
                recipientUserIds: adminRecipientUserIds,
                type: 'EXAM_SUBMISSION_RECEIVED',
                title: 'New Mock Exam Submission',
                message: `${submitterName} submitted an attempt for "${refreshedAttempt.exam.title}".`,
                link: `/manage-exams/${refreshedAttempt.examId}/submissions`,
                entityType: 'exam',
                entityId: refreshedAttempt.examId,
                severity: 'INFO',
            }),
        ]);

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
        answerMeta?: Record<string, { viewedAt?: string | null; answeredAt?: string | null; elapsedSeconds?: number | null }>;
        currentQuestionIndex?: number;
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
            include: {
                exam: { include: { questions: true } },
                answers: true,
            },
        });

        if (!latestAttempt) throw ApiError.notFound('Attempt not found');
        if (this.computeRemainingSeconds(latestAttempt.endsAt) <= 0) {
            await this.autoSubmitExpiredAttempt(attemptId);
            throw ApiError.badRequest('Attempt time expired and was auto-submitted');
        }

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
                    const existingAnswer = latestAttempt.answers.find((answer) => answer.questionId === questionId);
                    const clientViewedAtRaw = data.answerMeta?.[questionId]?.viewedAt;
                    const clientViewedAt = this.parseClientViewedAt(clientViewedAtRaw, latestAttempt.startedAt);
                    const clientAnsweredAtRaw = data.answerMeta?.[questionId]?.answeredAt;
                    const clientAnsweredAt = this.parseClientAnsweredAt(clientAnsweredAtRaw, latestAttempt.startedAt);
                    const clientElapsedSecondsRaw = data.answerMeta?.[questionId]?.elapsedSeconds;
                    const clientElapsedSeconds = this.parseClientElapsedSeconds(clientElapsedSecondsRaw);
                    const viewedAt = this.resolveViewedAt(existingAnswer, clientViewedAt);
                    const answeredAt = this.resolveAnsweredAt(existingAnswer, normalizedChoice, clientAnsweredAt);
                    const elapsedSeconds = this.resolveElapsedSeconds(existingAnswer, clientElapsedSeconds);

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
                            viewedAt,
                            answeredAt,
                            elapsedSeconds,
                        },
                        create: {
                            attemptId,
                            questionId,
                            selectedChoice: normalizedChoice,
                            isCorrect: normalizedChoice === question.correctChoice,
                            viewedAt,
                            answeredAt,
                            elapsedSeconds,
                        },
                    });
                }
            }

            const currentQuestionIndex = this.clampCurrentQuestionIndex(
                data.currentQuestionIndex,
                latestAttempt.exam.questions.length,
            );

            await tx.attempt.update({
                where: { id: attemptId },
                data: {
                    timeSpentSeconds: this.computeTimeSpentSeconds(latestAttempt.startedAt, latestAttempt.endsAt),
                    remainingSeconds: this.computeRemainingSeconds(latestAttempt.endsAt),
                    lastSavedAt: new Date(),
                    lastActivityAt: new Date(),
                    currentQuestionIndex: currentQuestionIndex ?? latestAttempt.currentQuestionIndex,
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

        return this.normalizeAttemptPayload(savedAttempt);
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
            const sectionName = question.section?.title || this.defaultSectionTitle;
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
                section: question.section?.title || this.defaultSectionTitle,
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
                    user: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            programTrack: true,
                            profilePicture: true,
                            campus: {
                                select: { id: true, name: true, code: true },
                            },
                        },
                    },
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
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        programTrack: true,
                        profilePicture: true,
                        campus: {
                            select: { id: true, name: true, code: true },
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
        if (!isAdmin && attempt.status !== 'SUBMITTED') {
            throw ApiError.badRequest('Review is only available after submission');
        }

        const elapsedSecondsByQuestionId = new Map<string, number | null>();

        for (const answer of attempt.answers) {
            if (typeof answer.elapsedSeconds === 'number') {
                elapsedSecondsByQuestionId.set(answer.questionId, Math.max(0, Math.round(answer.elapsedSeconds)));
            }
        }

        const sortedAnswers = [...attempt.answers]
            .filter((answer) => Boolean(answer.answeredAt))
            .sort((left, right) => {
                const leftTime = left.answeredAt ? left.answeredAt.getTime() : 0;
                const rightTime = right.answeredAt ? right.answeredAt.getTime() : 0;

                if (leftTime === rightTime) {
                    return left.questionId.localeCompare(right.questionId);
                }

                return leftTime - rightTime;
            });

        let previousAnsweredAt = attempt.startedAt.getTime();
        for (const answer of sortedAnswers) {
            if (elapsedSecondsByQuestionId.has(answer.questionId)) {
                previousAnsweredAt = answer.answeredAt ? answer.answeredAt.getTime() : previousAnsweredAt;
                continue;
            }

            const currentAnsweredAt = answer.answeredAt ? answer.answeredAt.getTime() : previousAnsweredAt;
            elapsedSecondsByQuestionId.set(
                answer.questionId,
                Math.max(0, Math.round((currentAnsweredAt - previousAnsweredAt) / 1000))
            );
            previousAnsweredAt = currentAnsweredAt;
        }

        const answerMeta = Object.fromEntries(attempt.answers.map((answer) => {
            const viewedAt = answer.viewedAt?.toISOString() || null;
            const answeredAt = answer.answeredAt?.toISOString() || null;
            const elapsedSeconds = elapsedSecondsByQuestionId.get(answer.questionId) ?? null;

            return [answer.questionId, {
                selectedChoice: answer.selectedChoice,
                viewedAt,
                answeredAt,
                elapsedSeconds,
            }];
        }));

        return {
            ...attempt,
            exam: {
                ...attempt.exam,
                questions: (attempt.exam?.questions || []).map((q: any) => ({
                    ...q,
                    section: q.section?.title || this.defaultSectionTitle,
                    sectionId: q.section?.id || q.sectionId || null,
                })),
            },
            user: this.normalizeUser(attempt.user),
            answers: Object.fromEntries(attempt.answers.map((a) => [a.questionId, a.selectedChoice])),
            answerMeta,
        };
    }
}

export const attemptService = new AttemptService();
