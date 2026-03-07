import { z } from 'zod';

export const createTrackSchema = z.object({
    name: z.string().trim().min(2, 'Program name must be at least 2 characters').max(120, 'Program name is too long'),
    code: z.string().trim().max(30, 'Program code is too long').optional(),
});

export const updateTrackSchema = createTrackSchema;

export const trackIdParamSchema = z.object({
    id: z.string().uuid('Invalid program id'),
});