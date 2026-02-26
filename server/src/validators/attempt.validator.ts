import { z } from 'zod';

export const startAttemptSchema = z.object({
    examId: z.string().min(1, 'examId is required'),
});
