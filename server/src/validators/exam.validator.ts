import { z } from 'zod';

export const createExamSchema = z.object({
    title: z.string().min(1, 'Title is required'),
    subject: z.string().min(1, 'Subject is required'),
    program: z.string().optional(),
    timeLimit: z.number().int().min(1, 'Time limit must be at least 1 minute'),
    scheduledDate: z.string().datetime().optional(),
    isPublished: z.boolean().optional(),
    questions: z.array(z.object({
        text: z.string().min(1, 'Question text is required'),
        choices: z.array(z.string()).min(2, 'At least 2 choices required'),
        correctAnswer: z.string().min(1, 'Correct answer is required'),
        explanation: z.string().optional(),
    })).min(1, 'At least 1 question is required'),
});

export const updateExamSchema = z.object({
    title: z.string().min(1).optional(),
    subject: z.string().min(1).optional(),
    program: z.string().optional(),
    timeLimit: z.number().int().min(1).optional(),
    scheduledDate: z.string().datetime().optional(),
    isPublished: z.boolean().optional(),
    questions: z.array(z.object({
        text: z.string().min(1),
        choices: z.array(z.string()).min(2),
        correctAnswer: z.string().min(1),
        explanation: z.string().optional(),
    })).optional(),
});

export const submitAttemptSchema = z.object({
    answers: z.record(z.string(), z.string()),
    timeSpent: z.number().int().optional(),
    autoSubmitted: z.boolean().optional(),
});
