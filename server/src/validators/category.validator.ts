import { z } from 'zod';

const hexColor = z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color (e.g. #3B82F6)')
    .nullable()
    .optional();

export const createCategorySchema = z.object({
    name: z.string().trim().min(1, 'Category name is required').max(100, 'Category name must be 100 characters or less'),
    color: hexColor,
});

export const updateCategorySchema = z.object({
    name: z.string().trim().min(1, 'Category name is required').max(100, 'Category name must be 100 characters or less'),
    color: hexColor,
});
