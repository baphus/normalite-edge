import prisma from '../config/db';
import { ApiError } from '../utils/ApiError';
import { ApplicableCategory, Role } from '@prisma/client';
import { notificationService } from './notification.service';
import { deckService } from './deck.service';

export class ExamService {
    private readonly defaultMultipleAttemptsLimit = 3;
    private readonly defaultSectionTitle = 'Main section';

    private async getAllowMultipleAttempts() {
        try {
            const rows = await prisma.$queryRaw<Array<{ allow_multiple_attempts: boolean }>>`
                SELECT allow_multiple_attempts
                FROM system_settings
                WHERE id = 1
                LIMIT 1
            `;

            if (rows.length > 0) {
                return Boolean(rows[0].allow_multiple_attempts);
            }

            await prisma.$executeRaw`
                INSERT INTO system_settings (id, allow_multiple_attempts)
                VALUES (1, false)
                ON CONFLICT (id) DO NOTHING
            `;

            return false;
        } catch (error) {
            console.error('Failed to read system settings, defaulting allowMultipleAttempts=false', error);
            return false;
        }
    }

    private toSectionKey(value?: string | null) {
        return (this.toEncodingSafeText(value)?.trim().toLowerCase() || this.defaultSectionTitle.toLowerCase())
            .replace(/\s+/g, ' ');
    }

    private normalizeSectionTitle(value?: string | null) {
        return this.toEncodingSafeText(value)?.trim() || this.defaultSectionTitle;
    }

    private async closeExpiredLiveExams() {
        await prisma.exam.updateMany({
            where: {
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

    private toEncodingSafeText(value?: string | null) {
        if (!value) return value ?? undefined;

        const symbolMap: Record<string, string> = {
            'π': 'pi',
            'Π': 'PI',
            '√': 'sqrt',
            '∞': 'infinity',
            '≈': '~',
            '≠': '!=',
            '≤': '<=',
            '≥': '>=',
            '−': '-',
            '–': '-',
            '—': '-',
            '×': 'x',
            '÷': '/',
            '°': ' deg',
            'µ': 'u',
            'Δ': 'Delta',
            'δ': 'delta',
            'α': 'alpha',
            'β': 'beta',
            'γ': 'gamma',
            'θ': 'theta',
            'λ': 'lambda',
            'σ': 'sigma',
            'ω': 'omega',
            '∑': 'sum',
            '∫': 'integral',
            '∂': 'd',
        };

        const mapped = value.replace(/[πΠ√∞≈≠≤≥−–—×÷°µΔδαβγθλσω∑∫∂]/g, (char) => symbolMap[char] || char);
        const deaccented = mapped.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
        const normalizedWhitespace = deaccented.replace(/\r\n/g, '\n').replace(/\u00A0/g, ' ');

        return normalizedWhitespace.replace(/[^\x09\x0A\x0D\x20-\x7E\x80-\xFF]/g, '');
    }

    private normalizeQuestionPayload(data: {
        text: string;
        choices: string[];
        correctAnswer: string;
        explanation?: string;
        section?: string;
        imageUrl?: string;
    }) {
        const normalizedImageUrl = (data.imageUrl || '').trim();
        const normalizedSection = this.normalizeSectionTitle(data.section);

        return {
            text: this.toEncodingSafeText(data.text) || '',
            choices: (data.choices || []).map((choice) => this.toEncodingSafeText(choice) || ''),
            correctAnswer: data.correctAnswer,
            explanation: this.toEncodingSafeText(data.explanation),
            section: normalizedSection,
            imageUrl: normalizedImageUrl || undefined,
        };
    }

    private categoryLabel(category?: ApplicableCategory | null) {
        switch (category) {
            case 'GENERAL_EDUCATION':
                return 'General Education';
            case 'PROFESSIONAL_EDUCATION':
                return 'Professional Education';
            case 'SPECIALIZATION':
                return 'Specialization';
            default:
                return 'No Category';
        }
    }

    private normalizeExam(exam: any, options?: { allowMultipleAttempts?: boolean }) {
        const allowMultipleAttempts = Boolean(options?.allowMultipleAttempts);
        const attempts = exam.attempts || [];
        const latestUserAttempt = attempts[0];
        const latestSubmittedAttempt = attempts.find((attempt: any) => attempt.status === 'SUBMITTED');
        const submittedAttemptsCount = attempts.filter((attempt: any) => attempt.status === 'SUBMITTED').length;
        const effectiveMaxAttempts = allowMultipleAttempts
            ? (exam.maxAttempts ?? this.defaultMultipleAttemptsLimit)
            : 1;
        const attemptsRemaining = Math.max(effectiveMaxAttempts - submittedAttemptsCount, 0);
        const hasSubmitted = attemptsRemaining === 0;

        return {
            ...exam,
            categoryCode: exam.category,
            category: this.categoryLabel(exam.category),
            tracks: (exam.trackLinks || []).map((link: any) => ({
                id: link.track.id,
                name: link.track.name,
                code: link.track.code,
            })),
            trackIds: (exam.trackLinks || []).map((link: any) => link.track.id),
            isPublished: exam.status === 'LIVE',
            timeLimit: exam.timeLimitMinutes,
            scheduledDate: exam.scheduleStart,
            deadline: exam.scheduleEnd,
            closeOnDeadline: Boolean(exam.closeOnDeadline),
            totalItems: exam.questions?.length ?? exam._count?.questions ?? 0,
            questionCount: exam.questions?.length ?? exam._count?.questions ?? 0,
            duration: exam.timeLimitMinutes,
            hasSubmitted,
            userAttemptStatus: latestUserAttempt?.status,
            attempts_remaining: attemptsRemaining,
            latestSubmittedAttemptId: latestSubmittedAttempt?.id || null,
            latestSubmittedScore: latestSubmittedAttempt?.percentage ?? null,
            sections: (exam.sections || [])
                .slice()
                .sort((a: any, b: any) => (a.orderNo || 0) - (b.orderNo || 0))
                .map((section: any) => ({
                    id: section.id,
                    title: section.title,
                    orderNo: section.orderNo,
                })),
            program_track: exam.programTrack,
            creator: exam.creator
                ? {
                    ...exam.creator,
                    name: `${exam.creator.firstName} ${exam.creator.lastName}`.trim(),
                }
                : undefined,
        };
    }

    /**
     * List exams with optional filters.
     */
    async listExams(params: {
        page?: number;
        limit?: number;
        subject?: string;
        category?: ApplicableCategory;
        program?: string;
        isPublished?: boolean;
        createdBy?: string;
        publishedOrMine?: string;
    }) {
        await this.closeExpiredLiveExams();
        const allowMultipleAttempts = await this.getAllowMultipleAttempts();

        const page = params.page || 1;
        const limit = params.limit || 20;
        const skip = (page - 1) * limit;

        const whereAnd: any[] = [];

        if (params.subject) whereAnd.push({ subject: params.subject });
        if (params.category) whereAnd.push({ category: params.category });

        if (params.program) {
            whereAnd.push({
                OR: [
                    { programTrack: params.program },
                    {
                        trackLinks: {
                            some: {
                                track: {
                                    OR: [
                                        { name: { equals: params.program, mode: 'insensitive' } },
                                        { code: { equals: params.program, mode: 'insensitive' } },
                                    ],
                                },
                            },
                        },
                    },
                ],
            });
        }

        if (params.publishedOrMine) {
            const reviewee = await prisma.user.findUnique({
                where: { id: params.publishedOrMine },
                select: {
                    trackId: true,
                },
            });

            const visibilityOr: any[] = [
                {
                    trackLinks: { none: {} },
                },
            ];

            if (reviewee?.trackId) {
                visibilityOr.push({
                    trackLinks: {
                        some: {
                            trackId: reviewee.trackId,
                        },
                    },
                });
            }

            whereAnd.push({ OR: visibilityOr });
            whereAnd.push({ status: { in: ['LIVE', 'CLOSED', 'ARCHIVED'] } });
        } else {
            if (params.isPublished !== undefined) {
                whereAnd.push({ status: params.isPublished ? 'LIVE' : 'DRAFT' });
            }
            if (params.createdBy) {
                whereAnd.push({ createdBy: params.createdBy });
            }
        }

        const where = whereAnd.length > 0 ? { AND: whereAnd } : {};

        const [exams, total] = await Promise.all([
            prisma.exam.findMany({
                where,
                include: {
                    creator: { select: { id: true, firstName: true, lastName: true } },
                    trackLinks: { include: { track: true } },
                    attempts: params.publishedOrMine
                        ? {
                            where: { userId: params.publishedOrMine },
                            select: { id: true, status: true, submittedAt: true, percentage: true },
                            orderBy: { createdAt: 'desc' },
                            take: 5,
                        }
                        : false,
                    sections: { select: { id: true, title: true, orderNo: true } },
                    _count: { select: { questions: true, attempts: true } },
                },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.exam.count({ where }),
        ]);

        return {
            exams: exams.map((exam) => this.normalizeExam(exam, { allowMultipleAttempts })),
            total,
            page,
            limit,
        };
    }

    /**
     * Get a single exam by ID, optionally including questions.
     */
    async getExam(examId: string, includeQuestions = false) {
        await this.closeExpiredLiveExams();

        const exam = await prisma.exam.findUnique({
            where: { id: examId },
            include: {
                questions: includeQuestions
                    ? {
                        orderBy: { orderNo: 'asc' },
                        include: {
                            section: { select: { id: true, title: true } },
                        },
                    }
                    : false,
                creator: { select: { id: true, firstName: true, lastName: true } },
                trackLinks: { include: { track: true } },
                sections: { select: { id: true, title: true, orderNo: true } },
                _count: { select: { attempts: true, questions: true } },
            },
        });

        if (!exam) throw ApiError.notFound('Exam not found');
        return this.normalizeExam(exam);
    }

    async exportExamToStudyDeck(examId: string, userId: string, userRole: Role) {
        const exam = await prisma.exam.findUnique({
            where: { id: examId },
            include: {
                trackLinks: { include: { track: true } },
                sections: { select: { id: true, title: true, orderNo: true } },
                questions: {
                    orderBy: { orderNo: 'asc' },
                    include: {
                        section: { select: { id: true, title: true, orderNo: true } },
                    },
                },
            },
        });

        if (!exam) {
            throw ApiError.notFound('Exam not found');
        }

        if (userRole !== 'ADMIN' && exam.createdBy !== userId) {
            throw ApiError.forbidden('You can only export mock exams you created');
        }

        if (!exam.questions.length) {
            throw ApiError.badRequest('This mock exam has no questions to export');
        }

        const sortedQuestions = exam.questions
            .slice()
            .sort((left, right) => {
                const leftSectionOrder = left.section?.orderNo ?? Number.MAX_SAFE_INTEGER;
                const rightSectionOrder = right.section?.orderNo ?? Number.MAX_SAFE_INTEGER;

                if (leftSectionOrder !== rightSectionOrder) {
                    return leftSectionOrder - rightSectionOrder;
                }

                return left.orderNo - right.orderNo;
            });

        const sectionSummary = exam.sections
            .slice()
            .sort((left, right) => left.orderNo - right.orderNo)
            .map((section) => section.title.trim())
            .filter(Boolean);

        const descriptionParts = [exam.description?.trim()].filter((value): value is string => Boolean(value));
        descriptionParts.push(`Exported from mock exam \"${exam.title}\".`);
        if (sectionSummary.length > 0) {
            descriptionParts.push(`Sections: ${sectionSummary.join(', ')}`);
        }

        const deck = await deckService.createDeck({
            title: `${exam.title} Study Material`,
            description: descriptionParts.join(' '),
            subject: exam.subject || undefined,
            category: exam.category,
            trackIds: exam.trackLinks.map((link) => link.trackId),
            visibility: 'DRAFT',
            questions: sortedQuestions.map((question, index) => {
                const correctChoice = (question.correctChoice || 'A').toUpperCase();
                const answerTextByChoice: Record<string, string | null | undefined> = {
                    A: question.choiceA,
                    B: question.choiceB,
                    C: question.choiceC,
                    D: question.choiceD,
                };

                return {
                    orderNo: index + 1,
                    questionText: question.questionText,
                    imageUrl: question.imageUrl || undefined,
                    choiceA: question.choiceA,
                    choiceB: question.choiceB,
                    choiceC: question.choiceC,
                    choiceD: question.choiceD,
                    correctChoice: ['A', 'B', 'C', 'D'].includes(correctChoice) ? correctChoice : 'A',
                    answerText: answerTextByChoice[correctChoice] || undefined,
                    rationalization: question.rationalization || undefined,
                    points: question.points || 1,
                };
            }),
            createdBy: userId,
        });

        return deck;
    }

    async getSubmissionAnalytics(examId: string, userId: string, userRole: Role) {
        await this.closeExpiredLiveExams();

        const exam = await prisma.exam.findUnique({
            where: { id: examId },
            include: {
                questions: {
                    orderBy: { orderNo: 'asc' },
                    include: {
                        section: { select: { id: true, title: true } },
                    },
                },
                attempts: {
                    where: { status: 'SUBMITTED' },
                    select: {
                        id: true,
                        userId: true,
                        startedAt: true,
                        submittedAt: true,
                        timeSpentSeconds: true,
                        answers: {
                            select: {
                                questionId: true,
                                isCorrect: true,
                                answeredAt: true,
                            },
                        },
                    },
                },
            },
        });

        if (!exam) throw ApiError.notFound('Exam not found');
        if (userRole !== 'ADMIN' && userRole !== 'REVIEWER' && exam.createdBy !== userId) {
            throw ApiError.forbidden('You do not have permission to view these submission analytics');
        }

        const now = Date.now();
        const scheduleEndMs = exam.scheduleEnd ? new Date(exam.scheduleEnd).getTime() : null;
        const canStudentsSubmit = exam.status === 'LIVE' && (!scheduleEndMs || scheduleEndMs >= now);

        let submissionMessage = 'Students cannot submit this exam right now.';
        if (exam.status === 'LIVE' && canStudentsSubmit) {
            submissionMessage = exam.scheduleEnd
                ? 'Students can still submit until the exam deadline.'
                : 'Students can still submit. No deadline is currently set.';
        } else if (exam.status === 'CLOSED') {
            submissionMessage = 'Submissions are closed for this exam.';
        } else if (exam.status === 'DRAFT') {
            submissionMessage = 'This exam is still in draft and not open for submissions.';
        } else if (exam.status === 'ARCHIVED') {
            submissionMessage = 'This exam is archived and no longer accepts submissions.';
        } else if (exam.scheduleEnd && scheduleEndMs && scheduleEndMs < now) {
            submissionMessage = 'The submission deadline has already passed.';
        }

        const durationSamples = exam.attempts
            .map((attempt) => {
                if (attempt.timeSpentSeconds > 0) {
                    return attempt.timeSpentSeconds;
                }

                if (attempt.submittedAt) {
                    return Math.max(0, Math.round((attempt.submittedAt.getTime() - attempt.startedAt.getTime()) / 1000));
                }

                return 0;
            })
            .filter((value) => value > 0);

        const averageCompletionSeconds = durationSamples.length > 0
            ? Math.round(durationSamples.reduce((sum, value) => sum + value, 0) / durationSamples.length)
            : 0;

        const questionStats = exam.questions.map((question) => {
            let rightCount = 0;
            let wrongCount = 0;
            let unansweredCount = exam.attempts.length;
            let answeredCount = 0;
            const answerTimeSamples: number[] = [];

            for (const attempt of exam.attempts) {
                const answer = attempt.answers.find((item) => item.questionId === question.id);
                if (!answer) {
                    continue;
                }

                unansweredCount -= 1;
                answeredCount += 1;

                if (answer.isCorrect) {
                    rightCount += 1;
                } else {
                    wrongCount += 1;
                }

                if (answer.answeredAt) {
                    const secondsToAnswer = Math.max(
                        0,
                        Math.round((answer.answeredAt.getTime() - attempt.startedAt.getTime()) / 1000),
                    );
                    answerTimeSamples.push(secondsToAnswer);
                }
            }

            const averageAnswerSeconds = answerTimeSamples.length > 0
                ? Math.round(answerTimeSamples.reduce((sum, value) => sum + value, 0) / answerTimeSamples.length)
                : null;

            return {
                questionId: question.id,
                orderNo: question.orderNo,
                section: question.section?.title || this.defaultSectionTitle,
                questionText: question.questionText,
                rightCount,
                wrongCount,
                unansweredCount,
                answeredCount,
                averageAnswerSeconds,
            };
        });

        const slowestQuestion = questionStats
            .filter((question) => question.averageAnswerSeconds !== null)
            .sort((left, right) => (right.averageAnswerSeconds || 0) - (left.averageAnswerSeconds || 0))[0] || null;

        return {
            examStatus: {
                status: exam.status,
                canStudentsSubmit,
                message: submissionMessage,
                scheduleEnd: exam.scheduleEnd,
                closeOnDeadline: Boolean(exam.closeOnDeadline),
            },
            submissionStats: {
                submittedCount: exam.attempts.length,
                averageCompletionSeconds,
                slowestQuestion: slowestQuestion
                    ? {
                        questionId: slowestQuestion.questionId,
                        orderNo: slowestQuestion.orderNo,
                        questionText: slowestQuestion.questionText,
                        averageAnswerSeconds: slowestQuestion.averageAnswerSeconds,
                        section: slowestQuestion.section || this.defaultSectionTitle,
                    }
                    : null,
            },
            questionStats,
        };
    }

    /**
     * Get exam for taking — hides correct answers and explanations.
     */
    async getExamForAttempt(examId: string) {
        await this.closeExpiredLiveExams();

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
                        section: { select: { id: true, title: true } },
                    },
                },
            },
        });

        if (!exam) throw ApiError.notFound('Exam not found');
        if (exam.status !== 'LIVE') throw ApiError.forbidden('This exam is not currently live');

        return {
            ...this.normalizeExam(exam),
            questions: exam.questions.map((q: any) => ({
                id: q.id,
                text: q.questionText,
                imageUrl: q.imageUrl || null,
                choices: [q.choiceA, q.choiceB, q.choiceC, q.choiceD],
                orderIndex: q.orderNo,
                section: q.section?.title || this.defaultSectionTitle,
            })),
        };
    }

    /**
     * Create a new exam with questions.
     */
    async createExam(data: {
        title: string;
        subject: string;
        category?: ApplicableCategory | null;
        program?: string;
        trackIds?: string[];
        timeLimit: number;
        maxAttempts?: number | null;
        scheduledDate?: Date;
        deadline?: Date;
        closeOnDeadline?: boolean;
        isPublished?: boolean;
        sections?: string[];
        questions: {
            text: string;
            choices: string[];
            correctAnswer: string;
            explanation?: string;
            section?: string;
            imageUrl?: string;
        }[];
        createdBy: string;
    }) {
        const normalizedQuestions = data.questions.map((q) => this.normalizeQuestionPayload(q));

        const exam = await prisma.$transaction(async (tx) => {
            const uniqueTrackIds = Array.from(new Set(data.trackIds || []));
            if (uniqueTrackIds.length > 0) {
                const trackCount = await tx.track.count({ where: { id: { in: uniqueTrackIds }, isActive: true } });
                if (trackCount !== uniqueTrackIds.length) {
                    throw ApiError.badRequest('One or more selected tracks are invalid or inactive');
                }
            }

            const createdExam = await tx.exam.create({
                data: {
                    title: this.toEncodingSafeText(data.title) || data.title,
                    subject: this.toEncodingSafeText(data.subject) || data.subject,
                    category: data.category ?? null,
                    programTrack: this.toEncodingSafeText(data.program) || undefined,
                    timeLimitMinutes: data.timeLimit,
                    maxAttempts: data.maxAttempts ?? null,
                    scheduleStart: data.scheduledDate,
                    scheduleEnd: data.deadline,
                    closeOnDeadline: Boolean(data.closeOnDeadline && data.deadline),
                    status: data.isPublished ? 'LIVE' : 'DRAFT',
                    createdBy: data.createdBy,
                },
            });

            if (uniqueTrackIds.length > 0) {
                await tx.examTrack.createMany({
                    data: uniqueTrackIds.map((trackId) => ({
                        examId: createdExam.id,
                        trackId,
                    })),
                });
            }

            const explicitSections = (data.sections || [])
                .map((section) => this.normalizeSectionTitle(section))
                .filter(Boolean);
            const questionSections = normalizedQuestions
                .map((question) => this.normalizeSectionTitle(question.section))
                .filter(Boolean);
            const sectionTitles = Array.from(new Set([...explicitSections, ...questionSections]));
            if (sectionTitles.length === 0) sectionTitles.push(this.defaultSectionTitle);

            await tx.examSection.createMany({
                data: sectionTitles.map((sectionTitle, index) => ({
                    examId: createdExam.id,
                    title: sectionTitle,
                    orderNo: index + 1,
                })),
            });

            const createdSections = await tx.examSection.findMany({
                where: { examId: createdExam.id },
                orderBy: { orderNo: 'asc' },
            });
            const sectionIdByTitle = new Map(createdSections.map((section) => [this.toSectionKey(section.title), section.id]));
            const defaultSectionId = createdSections[0]?.id;

            if (normalizedQuestions.length > 0) {
                await tx.examQuestion.createMany({
                    data: normalizedQuestions.map((q, index) => ({
                        examId: createdExam.id,
                        sectionId: sectionIdByTitle.get(this.toSectionKey(q.section)) || defaultSectionId!,
                        orderNo: index + 1,
                        questionText: q.text,
                        choiceA: q.choices[0] || '',
                        choiceB: q.choices[1] || '',
                        choiceC: q.choices[2] || '',
                        choiceD: q.choices[3] || '',
                        correctChoice: q.correctAnswer,
                        rationalization: q.explanation,
                        imageUrl: q.imageUrl,
                    })),
                });
            }

            return tx.exam.findUnique({
                where: { id: createdExam.id },
                include: {
                    questions: { orderBy: { orderNo: 'asc' } },
                    creator: { select: { id: true, firstName: true, lastName: true } },
                    trackLinks: { include: { track: true } },
                    sections: { select: { id: true, title: true, orderNo: true } },
                },
            });
        });

        if (exam?.status === 'LIVE') {
            const trackLabels = (exam.trackLinks || []).flatMap((link: any) => [link.track.name, link.track.code].filter(Boolean) as string[]);
            const recipientUserIds = trackLabels.length > 0
                ? await notificationService.getActiveRevieweeIdsByTrackLabels(trackLabels)
                : await notificationService.getActiveRevieweeIds(exam.programTrack || undefined);
            await notificationService.createNotifications({
                recipientUserIds,
                type: 'EXAM_PUBLISHED',
                title: 'New Exam Published',
                message: `A new exam is available: ${exam.title}`,
                link: '/exams',
                entityType: 'exam',
                entityId: exam.id,
                severity: 'INFO',
            });
        }

        return this.normalizeExam(exam);
    }

    /**
     * Update an exam and its questions.
     */
    async updateExam(examId: string, userId: string, userRole: Role, data: {
        title?: string;
        subject?: string;
        category?: ApplicableCategory | null;
        program?: string;
        trackIds?: string[];
        timeLimit?: number;
        maxAttempts?: number | null;
        scheduledDate?: Date;
        deadline?: Date;
        closeOnDeadline?: boolean;
        isPublished?: boolean;
        status?: 'LIVE' | 'DRAFT' | 'ARCHIVED' | 'CLOSED' | 'PUBLISHED';
        sections?: string[];
        questions?: {
            text: string;
            choices: string[];
            correctAnswer: string;
            explanation?: string;
            section?: string;
            imageUrl?: string;
        }[];
    }) {
        const normalizedQuestions = data.questions?.map((q) => this.normalizeQuestionPayload(q));

        const exam = await prisma.exam.findUnique({ where: { id: examId } });
        if (!exam) throw ApiError.notFound('Exam not found');
        if (userRole !== 'ADMIN' && exam.createdBy !== userId) {
            throw ApiError.forbidden('You can only edit exams you created');
        }
        if (exam.status === 'LIVE') {
            throw ApiError.forbidden('Published exams cannot be edited');
        }

        const wasLive = (exam.status as string) === 'LIVE';

        const updatedExam = await prisma.$transaction(async (tx) => {
            const uniqueTrackIds = data.trackIds ? Array.from(new Set(data.trackIds)) : undefined;
            if (uniqueTrackIds && uniqueTrackIds.length > 0) {
                const trackCount = await tx.track.count({ where: { id: { in: uniqueTrackIds }, isActive: true } });
                if (trackCount !== uniqueTrackIds.length) {
                    throw ApiError.badRequest('One or more selected tracks are invalid or inactive');
                }
            }

            const updateData: any = {
                title: this.toEncodingSafeText(data.title),
                subject: this.toEncodingSafeText(data.subject),
                category: data.category,
                programTrack: this.toEncodingSafeText(data.program),
                timeLimitMinutes: data.timeLimit,
                scheduleStart: data.scheduledDate,
                scheduleEnd: data.deadline,
                closeOnDeadline: data.closeOnDeadline,
                maxAttempts: data.maxAttempts,
            };

            if (typeof data.isPublished === 'boolean') {
                updateData.status = data.isPublished ? 'LIVE' : 'DRAFT';
            }

            if (data.status) {
                updateData.status = data.status === 'PUBLISHED' ? 'LIVE' : data.status;
            }

            await tx.exam.update({
                where: { id: examId },
                data: updateData,
            });

            if (uniqueTrackIds) {
                await tx.examTrack.deleteMany({ where: { examId } });
                if (uniqueTrackIds.length > 0) {
                    await tx.examTrack.createMany({
                        data: uniqueTrackIds.map((trackId) => ({ examId, trackId })),
                    });
                }
            }

            if (normalizedQuestions) {
                await tx.examQuestion.deleteMany({ where: { examId } });
                await tx.examSection.deleteMany({ where: { examId } });

                const explicitSections = (data.sections || [])
                    .map((section) => this.normalizeSectionTitle(section))
                    .filter(Boolean);
                const questionSections = normalizedQuestions
                    .map((question) => this.normalizeSectionTitle(question.section))
                    .filter(Boolean);
                const sectionTitles = Array.from(new Set([...explicitSections, ...questionSections]));
                if (sectionTitles.length === 0) sectionTitles.push(this.defaultSectionTitle);

                await tx.examSection.createMany({
                    data: sectionTitles.map((sectionTitle, index) => ({
                        examId,
                        title: sectionTitle,
                        orderNo: index + 1,
                    })),
                });

                const createdSections = await tx.examSection.findMany({
                    where: { examId },
                    orderBy: { orderNo: 'asc' },
                });
                const sectionIdByTitle = new Map(createdSections.map((section) => [this.toSectionKey(section.title), section.id]));
                const defaultSectionId = createdSections[0]?.id;

                if (normalizedQuestions.length > 0) {
                    await tx.examQuestion.createMany({
                        data: normalizedQuestions.map((q, index) => ({
                            examId,
                            sectionId: sectionIdByTitle.get(this.toSectionKey(q.section)) || defaultSectionId!,
                            orderNo: index + 1,
                            questionText: q.text,
                            choiceA: q.choices[0] || '',
                            choiceB: q.choices[1] || '',
                            choiceC: q.choices[2] || '',
                            choiceD: q.choices[3] || '',
                            correctChoice: q.correctAnswer,
                            rationalization: q.explanation,
                            imageUrl: q.imageUrl,
                        })),
                    });
                }
            }

            return tx.exam.findUnique({
                where: { id: examId },
                include: {
                    questions: { orderBy: { orderNo: 'asc' } },
                    creator: { select: { id: true, firstName: true, lastName: true } },
                    trackLinks: { include: { track: true } },
                    sections: { select: { id: true, title: true, orderNo: true } },
                },
            });
        });

        if (updatedExam?.status === 'LIVE' && !wasLive) {
            const trackLabels = (updatedExam.trackLinks || []).flatMap((link: any) => [link.track.name, link.track.code].filter(Boolean) as string[]);
            const recipientUserIds = trackLabels.length > 0
                ? await notificationService.getActiveRevieweeIdsByTrackLabels(trackLabels)
                : await notificationService.getActiveRevieweeIds(updatedExam.programTrack || undefined);
            await notificationService.createNotifications({
                recipientUserIds,
                type: 'EXAM_PUBLISHED',
                title: 'New Exam Published',
                message: `A new exam is available: ${updatedExam.title}`,
                link: '/exams',
                entityType: 'exam',
                entityId: updatedExam.id,
                severity: 'INFO',
            });
        }

        return this.normalizeExam(updatedExam);
    }

    /**
     * Delete an exam and all related data.
     */
    async deleteExam(examId: string, userId: string, userRole: Role) {
        const exam = await prisma.exam.findUnique({ where: { id: examId } });
        if (!exam) throw ApiError.notFound('Exam not found');
        if (userRole !== 'ADMIN' && exam.createdBy !== userId) {
            throw ApiError.forbidden('You can only delete exams you created');
        }

        await prisma.exam.delete({ where: { id: examId } });
        return { id: examId, title: exam.title };
    }
}

export const examService = new ExamService();
