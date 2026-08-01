import { z } from 'zod';
import { INTERNAL_EMAIL_DOMAIN, isInternalEmail } from '../config/env';

/**
 * Admin provisioning of an external account.
 *
 * Only email and role are required — the invited user fills in their own
 * profile details (name, campus, etc.) when they set their password.
 */
export const inviteUserSchema = z.object({
    email: z
        .string()
        .email('Invalid email address')
        .refine((email) => !isInternalEmail(email), {
            message:
                `@${INTERNAL_EMAIL_DOMAIN} accounts sign in with Google and cannot be invited. ` +
                'Ask the user to sign in with Google, then change their role.',
        }),
    role: z.enum(['ADMIN', 'REVIEWER', 'REVIEWEE']).default('REVIEWER'),
});

export const updateUserStatusSchema = z.object({
    status: z.enum(['ACTIVE', 'DISABLED']),
});

export const updateUserRoleSchema = z.object({
    role: z.enum(['ADMIN', 'REVIEWER', 'REVIEWEE']),
});

/**
 * Admin edit of user details.
 *
 * Password is absent: credentials live in Supabase Auth. To help an external
 * user who has lost their password, generate a recovery link instead
 * (POST /users/:id/recovery-link).
 *
 * Email is absent: it is the identity key shared with auth.users, and changing
 * it here would silently desynchronise the two tables.
 */
export const updateUserSchema = z.object({
    firstName: z.string().trim().min(1, 'First name is required').optional(),
    lastName: z.string().trim().min(1, 'Last name is required').optional(),
    middleInitial: z.string().max(1, 'Middle initial must be 1 character').optional(),
    suffix: z.string().max(20, 'Suffix is too long').optional(),
    track_id: z.string().uuid('Invalid track id').optional(),
    campus_id: z.string().uuid('Invalid campus id').optional(),
    yearLevel: z.string().trim().min(1, 'Year level is required').optional(),
    section: z.string().trim().min(1, 'Section is required').optional(),
});
