import { z } from 'zod';

export const updateSystemSettingsSchema = z.object({
    allowMultipleAttempts: z.boolean(),
});
