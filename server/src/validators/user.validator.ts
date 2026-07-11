import { z } from 'zod';

export const createUserSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').optional(),
    firstName: z.string().min(1, 'First name is required').optional(),
    lastName: z.string().min(1, 'Last name is required').optional(),
    middleInitial: z.string().max(1, 'Middle initial must be 1 character').optional(),
    suffix: z.string().max(20, 'Suffix is too long').optional(),
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password must not exceed 128 characters'),
    role: z.enum(['REVIEWER', 'REVIEWEE']).default('REVIEWEE'),
    status: z.enum(['PENDING', 'ACTIVE', 'DISABLED', 'APPROVED', 'REJECTED']).default('ACTIVE'),
    track_id: z.string().uuid('Invalid track id').optional(),
    campus_id: z.string().uuid('Invalid campus id').optional(),
    program_track: z.string().optional(),
    major: z.string().optional(),
    yearLevel: z.string().optional(),
    section: z.string().optional(),
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

    if (data.role === 'REVIEWEE') {
        if (!data.track_id && !data.program_track?.trim()) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Program track is required for reviewees',
                path: ['track_id'],
            });
        }

        if (!data.yearLevel?.trim()) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Year level is required for reviewees',
                path: ['yearLevel'],
            });
        }

        if (!data.section?.trim()) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Section is required for reviewees',
                path: ['section'],
            });
        }
    }

    if (data.role === 'REVIEWEE' || data.role === 'REVIEWER') {
        if (!data.campus_id) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Campus is required for reviewers and reviewees',
                path: ['campus_id'],
            });
        }
    }
});

export const updateUserStatusSchema = z.object({
    status: z.enum(['PENDING', 'ACTIVE', 'DISABLED', 'APPROVED', 'REJECTED']),
});

export const updateUserRoleSchema = z.object({
    role: z.enum(['ADMIN', 'REVIEWER', 'REVIEWEE']),
});

export const updateUserSchema = z.object({
    firstName: z.string().trim().min(1, 'First name is required').optional(),
    lastName: z.string().trim().min(1, 'Last name is required').optional(),
    middleInitial: z.string().max(1, 'Middle initial must be 1 character').optional(),
    suffix: z.string().max(20, 'Suffix is too long').optional(),
    email: z.string().email('Invalid email address').optional(),
    password: z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password must not exceed 128 characters').optional(),
    track_id: z.string().uuid('Invalid track id').optional(),
    campus_id: z.string().uuid('Invalid campus id').optional(),
    yearLevel: z.string().trim().min(1, 'Year level is required').optional(),
    section: z.string().trim().min(1, 'Section is required').optional(),
});
