import { z } from 'zod';

export const registerSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address').refine(
        (email) => email.toLowerCase().endsWith('@cnu.edu.ph'),
        { message: 'Only @cnu.edu.ph emails are allowed' }
    ),
    password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
});

export const updateProfileSchema = z.object({
    name: z.string().min(2).optional(),
    program: z.string().optional(),
    major: z.string().optional(),
    yearLevel: z.string().optional(),
    section: z.string().optional(),
});
