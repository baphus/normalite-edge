import { z } from 'zod';

export const updateUserStatusSchema = z.object({
    status: z.enum(['APPROVED', 'REJECTED']),
});

export const updateUserRoleSchema = z.object({
    role: z.enum(['ADMIN', 'REVIEWER', 'REVIEWEE']),
});
