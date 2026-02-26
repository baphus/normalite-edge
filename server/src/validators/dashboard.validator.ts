import { z } from 'zod';

export const submitDailyQuestionAnswerSchema = z.object({
    questionId: z.string().uuid('questionId must be a valid UUID'),
    selectedChoice: z.enum(['A', 'B', 'C', 'D']),
});
