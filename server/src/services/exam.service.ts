import prisma from '../config/db';
import { ApiError } from '../utils/ApiError';
import { ApplicableCategory, Role } from '@prisma/client';
import { notificationService } from './notification.service';

export class ExamService {
    private toSectionKey(value?: string | null) {
        return (this.toEncodingSafeText(value)?.trim().toLowerCase() || 'general section')
            .replace(/\s+/g, ' ');
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

        return {
            text: this.toEncodingSafeText(data.text) || '',
            choices: (data.choices || []).map((choice) => this.toEncodingSafeText(choice) || ''),
            correctAnswer: data.correctAnswer,
            explanation: this.toEncodingSafeText(data.explanation),
            section: this.toEncodingSafeText(data.section)?.trim() || 'General Section',
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

    private normalizeExam(exam: any) {
        const latestUserAttempt = (exam.attempts || [])[0];
        const hasSubmitted = latestUserAttempt?.status === 'SUBMITTED';

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
            attempts_remaining: hasSubmitted ? 0 : 1,
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
                            select: { id: true, status: true, submittedAt: true },
                            orderBy: { createdAt: 'desc' },
                            take: 1,
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

        return { exams: exams.map((exam) => this.normalizeExam(exam)), total, page, limit };
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
                section: q.section?.title || null,
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
                    maxAttempts: 1,
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
                .map((section) => this.toEncodingSafeText(section)?.trim() || '')
                .filter(Boolean);
            const questionSections = normalizedQuestions
                .map((question) => question.section?.trim() || 'General Section')
                .filter(Boolean);
            const sectionTitles = Array.from(new Set([...explicitSections, ...questionSections]));
            if (sectionTitles.length === 0) sectionTitles.push('General Section');

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

        const wasLive = exam.status === 'LIVE';

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
                maxAttempts: 1,
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
                    .map((section) => this.toEncodingSafeText(section)?.trim() || '')
                    .filter(Boolean);
                const questionSections = normalizedQuestions
                    .map((question) => question.section?.trim() || 'General Section')
                    .filter(Boolean);
                const sectionTitles = Array.from(new Set([...explicitSections, ...questionSections]));
                if (sectionTitles.length === 0) sectionTitles.push('General Section');

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
        return { id: examId };
    }
}

export const examService = new ExamService();
