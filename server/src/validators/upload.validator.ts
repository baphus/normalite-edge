import { z } from 'zod';

// Max ~1.5MB decoded image (base64 is ~33% larger than binary)
const MAX_BASE64_LENGTH = 2_000_000;

const imageDataUrlSchema = z
    .string()
    .min(1, 'fileDataUrl is required')
    .max(MAX_BASE64_LENGTH, 'File size exceeds the 1.5MB limit')
    .refine((value) => /^data:image\/(png|jpe?g|webp|gif|bmp);base64,/i.test(value), {
        message: 'fileDataUrl must be a valid base64 data:image payload (png, jpg, webp, gif, bmp)',
    });

export const uploadImageSchema = z.object({
    fileDataUrl: imageDataUrlSchema,
    folder: z.enum(['profile-pics', 'question-images']).default('question-images'),
});

export const uploadPublicProfileImageSchema = z.object({
    fileDataUrl: imageDataUrlSchema,
});
