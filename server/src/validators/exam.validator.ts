import { z } from 'zod';

const categorySchema = z.enum(['GENERAL_EDUCATION', 'PROFESSIONAL_EDUCATION', 'SPECIALIZATION']);
const requiredTrimmedString = (field: string) => z.string().trim().min(1, `${field} is required`);
const imageUrlSchema = z
    .string()
    .trim()
    .refine((value) => /^(https?:\/\/|data:image\/)/i.test(value), {
        message: 'Image must be an http(s) URL or data:image value',
    });
const examQuestionSchema = z.object({
    text: requiredTrimmedString('Question text'),
    choices: z.tuple([
        requiredTrimmedString('Choice A'),
        requiredTrimmedString('Choice B'),
        requiredTrimmedString('Choice C'),
        requiredTrimmedString('Choice D'),
    ]),
    correctAnswer: z.enum(['A', 'B', 'C', 'D']),
    explanation: z.string().trim().optional(),
    section: requiredTrimmedString('Section').optional(),
    imageUrl: imageUrlSchema.optional(),
});

export const createExamSchema = z.object({
    title: requiredTrimmedString('Title'),
    subject: requiredTrimmedString('Subject'),
    category: categorySchema.nullable().optional(),
    program: z.string().trim().optional(),
    program_track: z.string().trim().optional(),
    programTrack: z.string().trim().optional(),
    trackIds: z.array(z.string().uuid()).optional(),
    timeLimit: z.number().int().min(1, 'Time limit must be at least 1 minute'),
    maxAttempts: z.number().int().min(1, 'Max attempts must be at least 1').nullable().optional(),
    scheduledDate: z.string().datetime().optional(),
    deadline: z.string().datetime().optional(),
    closeOnDeadline: z.boolean().optional(),
    isPublished: z.boolean().optional(),
    sections: z.array(requiredTrimmedString('Section')).optional(),
    questions: z.array(examQuestionSchema).min(1, 'At least 1 question is required'),
});

export const updateExamSchema = z.object({
    title: requiredTrimmedString('Title').optional(),
    subject: requiredTrimmedString('Subject').optional(),
    category: categorySchema.nullable().optional(),
    program: z.string().trim().optional(),
    program_track: z.string().trim().optional(),
    programTrack: z.string().trim().optional(),
    trackIds: z.array(z.string().uuid()).optional(),
    timeLimit: z.number().int().min(1).optional(),
    maxAttempts: z.number().int().min(1).nullable().optional(),
    scheduledDate: z.string().datetime().optional(),
    deadline: z.string().datetime().optional(),
    closeOnDeadline: z.boolean().optional(),
    isPublished: z.boolean().optional(),
    status: z.enum(['LIVE', 'DRAFT', 'ARCHIVED', 'CLOSED', 'PUBLISHED']).optional(),
    sections: z.array(requiredTrimmedString('Section')).optional(),
    questions: z.array(examQuestionSchema).min(1, 'At least 1 question is required').optional(),
});

export const submitAttemptSchema = z.object({
    answers: z.record(z.string(), z.string()),
    timeSpent: z.number().int().optional(),
    autoSubmitted: z.boolean().optional(),
    remainingSeconds: z.number().int().optional(),
});

export const saveAttemptSchema = z.object({
    answers: z.record(z.string(), z.string()).optional(),
    timeSpent: z.number().int().optional(),
    remainingSeconds: z.number().int().optional(),
});
