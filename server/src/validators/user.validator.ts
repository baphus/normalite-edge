import { z } from 'zod';
import { INTERNAL_EMAIL_DOMAIN, isInternalEmail } from '../config/env';

/**
 * Admin provisioning of an external account.
 *
 * Only reachable for addresses outside the institution's Workspace: anyone
 * with an `@cnu.edu.ph` address signs in with Google instead, and reviewees
 * are locked to that domain with no exemption. No password is accepted — the
 * invited person sets their own via the generated invite link, so an admin
 * never learns another user's credential.
 */
export const inviteUserSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').optional(),
    firstName: z.string().min(1, 'First name is required').optional(),
    lastName: z.string().min(1, 'Last name is required').optional(),
    middleInitial: z.string().max(1, 'Middle initial must be 1 character').optional(),
    suffix: z.string().max(20, 'Suffix is too long').optional(),
    email: z
        .string()
        .email('Invalid email address')
        .refine((email) => !isInternalEmail(email), {
            message:
                `@${INTERNAL_EMAIL_DOMAIN} accounts sign in with Google and cannot be invited. ` +
                'Ask the user to sign in with Google, then change their role.',
        }),
    // ADMIN is permitted so a break-glass administrator can exist outside the
    // Google dependency. REVIEWEE is absent by design — reviewees are always
    // institutional accounts.
    role: z.enum(['ADMIN', 'REVIEWER']).default('REVIEWER'),
    campus_id: z.string().uuid('Invalid campus id').optional(),
}).superRefine((data, ctx) => {
    const hasCombinedName = Boolean(data.name?.trim());
    const hasSplitName = Boolean(data.firstName?.trim() && data.lastName?.trim());

    if (!hasCombinedName && !hasSplitName) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'First name and last name are required',
            path: ['firstName'],
        });
    }

    if (data.role === 'REVIEWER' && !data.campus_id) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Campus is required for reviewers',
            path: ['campus_id'],
        });
    }
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
