import { z } from 'zod';

export const createCampusSchema = z.object({
    name: z.string().trim().min(2, 'Campus name must be at least 2 characters').max(120, 'Campus name is too long'),
    code: z.string().trim().max(30, 'Campus code is too long').optional(),
});

export const updateCampusSchema = createCampusSchema;

export const campusIdParamSchema = z.object({
    id: z.string().uuid('Invalid campus id'),
});
