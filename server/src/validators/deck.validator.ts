import { z } from 'zod';

const categoryIdSchema = z.string().uuid().nullable().optional();
const requiredTrimmedString = (field: string) => z.string().trim().min(1, `${field} is required`);

/**
 * Null clears an existing value; omitting the key leaves it untouched.
 * Plain `.optional()` could not express "clear this" — an emptied field arrived as
 * undefined and Prisma ignored it, so the value was stuck forever once set.
 */
const clearableTrimmedString = z.string().trim().nullable().optional();

const deckQuestionSchema = z.object({
    orderNo: z.number().int().min(1).optional(),
    questionText: requiredTrimmedString('questionText'),
    imageUrl: z.string().trim().optional(),
    choiceA: requiredTrimmedString('choiceA'),
    choiceB: requiredTrimmedString('choiceB'),
    choiceC: requiredTrimmedString('choiceC'),
    choiceD: requiredTrimmedString('choiceD'),
    correctChoice: z.enum(['A', 'B', 'C', 'D']),
    answerText: z.string().trim().optional(),
    rationalization: z.string().trim().optional(),
    points: z.number().int().min(1).optional(),
});

export const createDeckSchema = z.object({
    title: requiredTrimmedString('title'),
    description: clearableTrimmedString,
    subject: clearableTrimmedString,
    categoryId: categoryIdSchema,
    program: z.string().trim().optional(),
    program_track: z.string().trim().optional(),
    programTrack: z.string().trim().optional(),
    visibility: z.enum(['DRAFT', 'PUBLISHED']).optional(),
    trackIds: z.array(z.string().uuid()).optional(),
    questions: z.array(deckQuestionSchema).min(1, 'At least 1 question is required'),
});

export const updateDeckSchema = z.object({
    title: requiredTrimmedString('title').optional(),
    description: clearableTrimmedString,
    subject: clearableTrimmedString,
    categoryId: categoryIdSchema,
    program: z.string().trim().optional(),
    program_track: z.string().trim().optional(),
    programTrack: z.string().trim().optional(),
    visibility: z.enum(['DRAFT', 'PUBLISHED']).optional(),
    trackIds: z.array(z.string().uuid()).optional(),
    questions: z.array(deckQuestionSchema).min(1, 'At least 1 question is required').optional(),
});

export const startDeckSessionSchema = z.object({
    mode: z.enum(['VIEW', 'FLASHCARDS', 'QUIZ']),
});

const deckSessionItemSchema = z.object({
    questionId: z.string().min(1, 'questionId is required'),
    wasViewed: z.boolean().optional(),
    selectedChoice: z.enum(['A', 'B', 'C', 'D']).nullable().optional(),
    isCorrect: z.boolean().nullable().optional(),
});

export const saveDeckSessionSchema = z.object({
    currentIndex: z.number().int().min(0).optional(),
    score: z.number().int().min(0).optional(),
    totalItems: z.number().int().min(0).optional(),
    items: z.array(deckSessionItemSchema).optional(),
});

export const endDeckSessionSchema = z.object({
    status: z.enum(['COMPLETED', 'ENDED']).optional(),
    currentIndex: z.number().int().min(0).optional(),
    score: z.number().int().min(0).optional(),
    totalItems: z.number().int().min(0).optional(),
    items: z.array(deckSessionItemSchema).optional(),
});
