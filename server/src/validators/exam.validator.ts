import { z } from 'zod';

const categorySchema = z.enum(['GENERAL_EDUCATION', 'PROFESSIONAL_EDUCATION', 'SPECIALIZATION']);

export const createExamSchema = z.object({
    title: z.string().min(1, 'Title is required'),
    subject: z.string().min(1, 'Subject is required'),
    category: categorySchema.nullable().optional(),
    program: z.string().optional(),
    program_track: z.string().optional(),
    programTrack: z.string().optional(),
    trackIds: z.array(z.string().uuid()).optional(),
    timeLimit: z.number().int().min(1, 'Time limit must be at least 1 minute'),
    maxAttempts: z.number().int().min(1, 'Max attempts must be at least 1').nullable().optional(),
    scheduledDate: z.string().datetime().optional(),
    deadline: z.string().datetime().optional(),
    closeOnDeadline: z.boolean().optional(),
    isPublished: z.boolean().optional(),
    sections: z.array(z.string().min(1)).optional(),
    questions: z.array(z.object({
        text: z.string().min(1, 'Question text is required'),
        choices: z.array(z.string()).min(2, 'At least 2 choices required'),
        correctAnswer: z.string().min(1, 'Correct answer is required'),
        explanation: z.string().optional(),
        section: z.string().min(1).optional(),
    })).min(1, 'At least 1 question is required'),
});

export const updateExamSchema = z.object({
    title: z.string().min(1).optional(),
    subject: z.string().min(1).optional(),
    category: categorySchema.nullable().optional(),
    program: z.string().optional(),
    program_track: z.string().optional(),
    programTrack: z.string().optional(),
    trackIds: z.array(z.string().uuid()).optional(),
    timeLimit: z.number().int().min(1).optional(),
    maxAttempts: z.number().int().min(1).nullable().optional(),
    scheduledDate: z.string().datetime().optional(),
    deadline: z.string().datetime().optional(),
    closeOnDeadline: z.boolean().optional(),
    isPublished: z.boolean().optional(),
    status: z.enum(['LIVE', 'DRAFT', 'ARCHIVED', 'CLOSED', 'PUBLISHED']).optional(),
    sections: z.array(z.string().min(1)).optional(),
    questions: z.array(z.object({
        text: z.string().min(1),
        choices: z.array(z.string()).min(2),
        correctAnswer: z.string().min(1),
        explanation: z.string().optional(),
        section: z.string().min(1).optional(),
    })).optional(),
});

export const submitAttemptSchema = z.object({
    answers: z.record(z.string(), z.string()),
    timeSpent: z.number().int().optional(),
    autoSubmitted: z.boolean().optional(),
});

export const saveAttemptSchema = z.object({
    answers: z.record(z.string(), z.string()).optional(),
    timeSpent: z.number().int().optional(),
    remainingSeconds: z.number().int().optional(),
});
