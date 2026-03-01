import { z } from 'zod';

export const uploadImageSchema = z.object({
    fileDataUrl: z
        .string()
        .min(1, 'fileDataUrl is required')
        .refine((value) => /^data:image\/(png|jpe?g|webp|gif|bmp|svg\+xml);base64,/i.test(value), {
            message: 'fileDataUrl must be a valid base64 data:image payload',
        }),
    folder: z.enum(['profile-pics', 'question-images']).default('question-images'),
});
