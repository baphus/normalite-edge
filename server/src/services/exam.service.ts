import prisma from '../config/db';
import { ApiError } from '../utils/ApiError';
import { ApplicableCategory, Role } from '@prisma/client';
import { notificationService } from './notification.service';

export class ExamService {
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
    }) {
        return {
            text: this.toEncodingSafeText(data.text) || '',
            choices: (data.choices || []).map((choice) => this.toEncodingSafeText(choice) || ''),
            correctAnswer: data.correctAnswer,
            explanation: this.toEncodingSafeText(data.explanation),
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
            isPublished: exam.status === 'PUBLISHED',
            timeLimit: exam.timeLimitMinutes,
            scheduledDate: exam.scheduleStart,
            totalItems: exam.questions?.length ?? exam._count?.questions ?? 0,
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
        const page = params.page || 1;
        const limit = params.limit || 20;
        const skip = (page - 1) * limit;

        const where: any = {};
        if (params.subject) where.subject = params.subject;
        if (params.category) where.category = params.category;
        if (params.program) {
            where.OR = [
                ...(where.OR || []),
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
            ];
        }

        if (params.publishedOrMine) {
            where.OR = [
                { status: 'PUBLISHED' },
                { createdBy: params.publishedOrMine },
            ];
            if (params.isPublished !== undefined) {
                where.status = params.isPublished ? 'PUBLISHED' : 'DRAFT';
                delete where.OR;
            }
        } else {
            if (params.isPublished !== undefined) where.status = params.isPublished ? 'PUBLISHED' : 'DRAFT';
            if (params.createdBy) where.createdBy = params.createdBy;
        }

        const [exams, total] = await Promise.all([
            prisma.exam.findMany({
                where,
                include: {
                    creator: { select: { id: true, firstName: true, lastName: true } },
                    trackLinks: { include: { track: true } },
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
        const exam = await prisma.exam.findUnique({
            where: { id: examId },
            include: {
                questions: includeQuestions ? { orderBy: { orderNo: 'asc' } } : false,
                creator: { select: { id: true, firstName: true, lastName: true } },
                trackLinks: { include: { track: true } },
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
        if (exam.status !== 'PUBLISHED') throw ApiError.forbidden('This exam is not yet published');

        return {
            ...this.normalizeExam(exam),
            questions: exam.questions.map((q) => ({
                id: q.id,
                text: q.questionText,
                choices: [q.choiceA, q.choiceB, q.choiceC, q.choiceD],
                orderIndex: q.orderNo,
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
        isPublished?: boolean;
        questions: {
            text: string;
            choices: string[];
            correctAnswer: string;
            explanation?: string;
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
                    status: data.isPublished ? 'PUBLISHED' : 'DRAFT',
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

            const section = await tx.examSection.create({
                data: {
                    examId: createdExam.id,
                    title: 'General Section',
                    orderNo: 1,
                },
            });

            if (normalizedQuestions.length > 0) {
                await tx.examQuestion.createMany({
                    data: normalizedQuestions.map((q, index) => ({
                        examId: createdExam.id,
                        sectionId: section.id,
                        orderNo: index + 1,
                        questionText: q.text,
                        choiceA: q.choices[0] || '',
                        choiceB: q.choices[1] || '',
                        choiceC: q.choices[2] || '',
                        choiceD: q.choices[3] || '',
                        correctChoice: q.correctAnswer,
                        rationalization: q.explanation,
                    })),
                });
            }

            return tx.exam.findUnique({
                where: { id: createdExam.id },
                include: {
                    questions: { orderBy: { orderNo: 'asc' } },
                    creator: { select: { id: true, firstName: true, lastName: true } },
                    trackLinks: { include: { track: true } },
                },
            });
        });

        if (exam?.status === 'PUBLISHED') {
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
        isPublished?: boolean;
        questions?: {
            text: string;
            choices: string[];
            correctAnswer: string;
            explanation?: string;
        }[];
    }) {
        const normalizedQuestions = data.questions?.map((q) => this.normalizeQuestionPayload(q));

        const exam = await prisma.exam.findUnique({ where: { id: examId } });
        if (!exam) throw ApiError.notFound('Exam not found');
        if (userRole !== 'ADMIN' && exam.createdBy !== userId) {
            throw ApiError.forbidden('You can only edit exams you created');
        }

        const wasPublished = exam.status === 'PUBLISHED';

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
                maxAttempts: data.maxAttempts,
                scheduleStart: data.scheduledDate,
            };

            if (typeof data.isPublished === 'boolean') {
                updateData.status = data.isPublished ? 'PUBLISHED' : 'DRAFT';
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
                const section = await tx.examSection.findFirst({
                    where: { examId },
                    orderBy: { orderNo: 'asc' },
                }) || await tx.examSection.create({
                    data: {
                        examId,
                        title: 'General Section',
                        orderNo: 1,
                    },
                });

                await tx.examQuestion.deleteMany({ where: { examId } });

                if (normalizedQuestions.length > 0) {
                    await tx.examQuestion.createMany({
                        data: normalizedQuestions.map((q, index) => ({
                            examId,
                            sectionId: section.id,
                            orderNo: index + 1,
                            questionText: q.text,
                            choiceA: q.choices[0] || '',
                            choiceB: q.choices[1] || '',
                            choiceC: q.choices[2] || '',
                            choiceD: q.choices[3] || '',
                            correctChoice: q.correctAnswer,
                            rationalization: q.explanation,
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
                },
            });
        });

        if (updatedExam?.status === 'PUBLISHED' && !wasPublished) {
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
