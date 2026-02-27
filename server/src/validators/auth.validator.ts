import { z } from 'zod';

export const registerSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').optional(),
    firstName: z.string().min(1, 'First name is required').optional(),
    lastName: z.string().min(1, 'Last name is required').optional(),
    middleInitial: z
        .string()
        .trim()
        .min(1, 'Middle initial is required')
        .transform((value) => (value ? value[0].toUpperCase() : value))
        .refine((value) => value.length <= 1, { message: 'Middle initial must be 1 character' }),
    suffix: z.string().trim().max(20, 'Suffix is too long').optional(),
    email: z.string().email('Invalid email address').refine(
        (email) => email.toLowerCase().endsWith('@cnu.edu.ph'),
        { message: 'Only @cnu.edu.ph emails are allowed' }
    ),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    track_id: z.string().uuid('Invalid track id').optional(),
    program: z.string().min(1, 'Program is required').optional(),
    program_track: z.string().min(1, 'Program track is required').optional(),
    programTrack: z.string().min(1, 'Program track is required').optional(),
    major: z.string().optional(),
    yearLevel: z.string().optional(),
    section: z.string().optional(),
}).refine(
    (data) => !!(data.name || (data.firstName && data.lastName)),
    {
        message: 'Provide name or first and last name',
        path: ['firstName'],
    }
).refine(
    (data) => !!(data.track_id || data.program || data.program_track || data.programTrack),
    {
        message: 'Program is required',
        path: ['program'],
    }
);

export const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
});

export const verifyEmailSchema = z.object({
    token: z.string().min(1, 'Verification token is required'),
});

export const resendVerificationSchema = z.object({
    email: z.string().email('Invalid email address').refine(
        (email) => email.toLowerCase().endsWith('@cnu.edu.ph'),
        { message: 'Only @cnu.edu.ph emails are allowed' }
    ),
});

export const updateProfileSchema = z.object({
    name: z.string().min(2).optional(),
    track_id: z.string().uuid('Invalid track id').optional(),
    program: z.string().optional(),
    program_track: z.string().optional(),
    programTrack: z.string().optional(),
    major: z.string().optional(),
    yearLevel: z.string().optional(),
    section: z.string().optional(),
});
