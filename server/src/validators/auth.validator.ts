import { z } from 'zod';
import { isStorableAvatarUrl } from '../utils/importRemoteAvatar';

/**
 * A profile picture URL the client is allowed to persist.
 *
 * Restricted to our own upload bucket and the provider's avatar host. A stored
 * avatar is rendered back to reviewers and admins, so accepting any URL here
 * would let an account plant a tracking pixel or arbitrary remote content in
 * someone else's page.
 */
const avatarUrlSchema = z
    .string()
    .url('Profile picture must be a valid URL')
    .max(2048, 'Profile picture URL is too long')
    .refine(isStorableAvatarUrl, {
        message: 'Profile picture must be an uploaded image',
    });

/**
 * Academic details collected after a first Google sign-in or invite-link setup.
 *
 * Email is absent by design: it comes from the verified Supabase token, never
 * from the request body. Accepting a client-supplied address here would let a
 * caller register a profile against someone else's identity.
 *
 * Password is absent: institutional accounts authenticate through Google only.
 *
 * Role-dependent fields (track, campus, yearLevel, section, studentId,
 * contactNumber) are all optional here. The client enforces per-role
 * requirements via `buildProfileSchema` — which field set is required depends
 * on the user's role, which the server learns only after validation. The
 * service layer falls back to existing values for omitted fields.
 */
export const completeProfileSchema = z.object({
    firstName: z.string().trim().min(1, 'First name is required'),
    lastName: z.string().trim().min(1, 'Last name is required'),
    middleInitial: z
        .string()
        .trim()
        .max(1, 'Middle initial must be 1 character')
        .transform((value) => (value ? value[0].toUpperCase() : value))
        .optional(),
    suffix: z.string().trim().max(20, 'Suffix is too long').optional(),
    picture: avatarUrlSchema.optional(),
    track_id: z.string().uuid('Invalid track id').optional(),
    campus_id: z.string().uuid('Invalid campus id').optional(),
    yearLevel: z.string().trim().min(1, 'Year is required').optional(),
    section: z.string().trim().min(1, 'Section is required').optional(),
    studentId: z.string().trim().min(1, 'Student ID is required').optional(),
    contactNumber: z.string().trim().regex(/^09\d{9}$/, 'Contact number must be in Philippine format (09XXXXXXXXX)').optional(),
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
    picture: avatarUrlSchema.optional(),
    track_id: z.string().uuid('Invalid track id').optional(),
    campus_id: z.string().uuid('Invalid campus id').optional(),
    program: z.string().optional(),
    program_track: z.string().optional(),
    programTrack: z.string().optional(),
    major: z.string().optional(),
    yearLevel: z.string().trim().min(1, 'Year is required').optional(),
    section: z.string().trim().min(1, 'Section is required').optional(),
    studentId: z.string().trim().min(1, 'Student ID is required').optional(),
    contactNumber: z.string().trim().regex(/^09\d{9}$/, 'Contact number must be in Philippine format (09XXXXXXXXX)').optional(),
});

export const completeOnboardingSchema = z.object({
    picture: avatarUrlSchema.optional(),
});

export const completeTourSchema = z.object({
    tourId: z
        .string()
        .trim()
        .min(1, 'tourId is required')
        .max(120, 'tourId is too long'),
});
