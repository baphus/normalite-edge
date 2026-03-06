import { z } from 'zod';

const categorySchema = z.enum(['GENERAL_EDUCATION', 'PROFESSIONAL_EDUCATION', 'SPECIALIZATION']);

const deckQuestionSchema = z.object({
    orderNo: z.number().int().min(1).optional(),
    questionText: z.string().min(1, 'questionText is required'),
    imageUrl: z.string().optional(),
    choiceA: z.string().optional(),
    choiceB: z.string().optional(),
    choiceC: z.string().optional(),
    choiceD: z.string().optional(),
    correctChoice: z.enum(['A', 'B', 'C', 'D']).optional(),
    answerText: z.string().optional(),
    rationalization: z.string().optional(),
    points: z.number().int().min(1).optional(),
});

export const createDeckSchema = z.object({
    title: z.string().min(1, 'title is required'),
    description: z.string().optional(),
    subject: z.string().optional(),
    category: categorySchema.nullable().optional(),
    program: z.string().optional(),
    program_track: z.string().optional(),
    programTrack: z.string().optional(),
    visibility: z.enum(['DRAFT', 'PUBLISHED']).optional(),
    trackIds: z.array(z.string().uuid()).optional(),
    questions: z.array(deckQuestionSchema).optional(),
});

export const updateDeckSchema = z.object({
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    subject: z.string().optional(),
    category: categorySchema.nullable().optional(),
    program: z.string().optional(),
    program_track: z.string().optional(),
    programTrack: z.string().optional(),
    visibility: z.enum(['DRAFT', 'PUBLISHED']).optional(),
    trackIds: z.array(z.string().uuid()).optional(),
    questions: z.array(deckQuestionSchema).optional(),
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
