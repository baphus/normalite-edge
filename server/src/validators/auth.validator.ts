import { z } from 'zod';

/**
 * Academic details collected after a first Google sign-in.
 *
 * Email is absent by design: it comes from the verified Supabase token, never
 * from the request body. Accepting a client-supplied address here would let a
 * caller register a profile against someone else's identity.
 *
 * Password is absent: institutional accounts authenticate through Google only.
 */
export const completeProfileSchema = z.object({
    firstName: z.string().trim().min(1, 'First name is required'),
    lastName: z.string().trim().min(1, 'Last name is required'),
    middleInitial: z
        .string()
        .trim()
        .min(1, 'Middle initial is required')
        .transform((value) => (value ? value[0].toUpperCase() : value))
        .refine((value) => value.length <= 1, { message: 'Middle initial must be 1 character' }),
    suffix: z.string().trim().max(20, 'Suffix is too long').optional(),
    track_id: z.string().uuid('Invalid track id'),
    campus_id: z.string().uuid('Invalid campus id'),
    yearLevel: z.string().trim().min(1, 'Year is required'),
    section: z.string().trim().min(1, 'Section is required'),
});

export const updateProfileSchema = z.object({
    firstName: z.string().trim().min(1, 'First name is required').optional(),
    lastName: z.string().trim().min(1, 'Last name is required').optional(),
    middleInitial: z
        .string()
        .trim()
        .min(1, 'Middle initial is required')
        .transform((value) => (value ? value[0].toUpperCase() : value))
        .refine((value) => value.length <= 1, { message: 'Middle initial must be 1 character' })
        .optional(),
    suffix: z.string().trim().max(20, 'Suffix is too long').optional(),
    name: z.string().min(2).optional(),
    picture: z.string().url('picture must be a valid URL').optional(),
    track_id: z.string().uuid('Invalid track id').optional(),
    campus_id: z.string().uuid('Invalid campus id').optional(),
    program: z.string().optional(),
    program_track: z.string().optional(),
    programTrack: z.string().optional(),
    major: z.string().optional(),
    yearLevel: z.string().trim().min(1, 'Year is required').optional(),
    section: z.string().trim().min(1, 'Section is required').optional(),
});

export const completeOnboardingSchema = z.object({
    picture: z.string().url('picture must be a valid URL').optional(),
});

export const completeTourSchema = z.object({
    tourId: z
        .string()
        .trim()
        .min(1, 'tourId is required')
        .max(120, 'tourId is too long'),
});
