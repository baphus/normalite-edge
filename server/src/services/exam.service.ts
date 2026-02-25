import prisma from '../config/db';
import { ApiError } from '../utils/ApiError';

export class ExamService {
    /**
     * List exams with optional filters.
     */
    async listExams(params: {
        page?: number;
        limit?: number;
        subject?: string;
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
        if (params.program) where.program = params.program;

        if (params.publishedOrMine) {
            where.OR = [
                { isPublished: true },
                { createdBy: params.publishedOrMine }
            ];
            if (params.isPublished !== undefined) {
                where.isPublished = params.isPublished;
                delete where.OR;
            }
        } else {
            if (params.isPublished !== undefined) where.isPublished = params.isPublished;
            if (params.createdBy) where.createdBy = params.createdBy;
        }

        const [exams, total] = await Promise.all([
            prisma.exam.findMany({
                where,
                include: {
                    creator: { select: { id: true, name: true } },
                    _count: { select: { questions: true, attempts: true } },
                },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.exam.count({ where }),
        ]);

        return { exams, total, page, limit };
    }

    /**
     * Get a single exam by ID, optionally including questions.
     */
    async getExam(examId: string, includeQuestions = false) {
        const exam = await prisma.exam.findUnique({
            where: { id: examId },
            include: {
                questions: includeQuestions ? { orderBy: { orderIndex: 'asc' } } : false,
                creator: { select: { id: true, name: true } },
                _count: { select: { attempts: true } },
            },
        });

        if (!exam) throw ApiError.notFound('Exam not found');
        return exam;
    }

    /**
     * Get exam for taking — hides correct answers and explanations.
     */
    async getExamForAttempt(examId: string) {
        const exam = await prisma.exam.findUnique({
            where: { id: examId },
            include: {
                questions: {
                    orderBy: { orderIndex: 'asc' },
                    select: {
                        id: true,
                        text: true,
                        choices: true,
                        orderIndex: true,
                        // correctAnswer and explanation intentionally excluded
                    },
                },
            },
        });

        if (!exam) throw ApiError.notFound('Exam not found');
        if (!exam.isPublished) throw ApiError.forbidden('This exam is not yet published');
        return exam;
    }

    /**
     * Create a new exam with questions.
     */
    async createExam(data: {
        title: string;
        subject: string;
        program?: string;
        timeLimit: number;
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
        const exam = await prisma.exam.create({
            data: {
                title: data.title,
                subject: data.subject,
                program: data.program,
                timeLimit: data.timeLimit,
                totalItems: data.questions.length,
                scheduledDate: data.scheduledDate,
                isPublished: data.isPublished || false,
                createdBy: data.createdBy,
                questions: {
                    create: data.questions.map((q, index) => ({
                        text: q.text,
                        choices: q.choices,
                        correctAnswer: q.correctAnswer,
                        explanation: q.explanation,
                        orderIndex: index + 1,
                    })),
                },
            },
            include: {
                questions: { orderBy: { orderIndex: 'asc' } },
                creator: { select: { id: true, name: true } },
            },
        });

        return exam;
    }

    /**
     * Update an exam and its questions.
     */
    async updateExam(examId: string, userId: string, data: {
        title?: string;
        subject?: string;
        program?: string;
        timeLimit?: number;
        scheduledDate?: Date;
        isPublished?: boolean;
        questions?: {
            text: string;
            choices: string[];
            correctAnswer: string;
            explanation?: string;
        }[];
    }) {
        const exam = await prisma.exam.findUnique({ where: { id: examId } });
        if (!exam) throw ApiError.notFound('Exam not found');

        const updateData: any = { ...data };
        delete updateData.questions;

        if (data.questions) {
            // Replace all questions
            await prisma.question.deleteMany({ where: { examId } });
            updateData.totalItems = data.questions.length;
            updateData.questions = {
                create: data.questions.map((q, index) => ({
                    text: q.text,
                    choices: q.choices,
                    correctAnswer: q.correctAnswer,
                    explanation: q.explanation,
                    orderIndex: index + 1,
                })),
            };
        }

        return prisma.exam.update({
            where: { id: examId },
            data: updateData,
            include: {
                questions: { orderBy: { orderIndex: 'asc' } },
                creator: { select: { id: true, name: true } },
            },
        });
    }

    /**
     * Delete an exam and all related data.
     */
    async deleteExam(examId: string) {
        const exam = await prisma.exam.findUnique({ where: { id: examId } });
        if (!exam) throw ApiError.notFound('Exam not found');

        await prisma.exam.delete({ where: { id: examId } });
        return { id: examId };
    }
}

export const examService = new ExamService();
