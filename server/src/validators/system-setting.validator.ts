import { z } from 'zod';

export const updateSystemSettingsSchema = z.object({
    allowMultipleAttempts: z.boolean(),
    enforceExamSingleTab: z.boolean(),
    tabSwitchGraceSeconds: z.number().int().min(1).max(30),
});
