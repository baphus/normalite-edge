import prisma from '../config/db';
import { ApiError } from '../utils/ApiError';
import { Role } from '@prisma/client';
import { dashboardService } from './dashboard.service';
import { fromDbUserStatus, resolveProgramTrack, toDbUserStatus } from '../utils/requirementsCompat';
import { notificationService } from './notification.service';
import { supabaseAdmin } from '../config/supabase';
import { env, isInternalEmail, INTERNAL_EMAIL_DOMAIN } from '../config/env';

/** Where an invite or recovery link drops the user once Supabase verifies it. */
const SET_PASSWORD_REDIRECT = `${env.CLIENT_URL}/set-password`;

export class UserService {
    private splitName(name: string) {
        const parts = name.trim().split(/\s+/).filter(Boolean);
        const firstName = parts[0] || 'User';
        const lastName = parts.slice(1).join(' ') || 'Account';
        return { firstName, lastName };
    }

    private async resolveActiveTrack(input?: { track_id?: string; program_track?: string }) {
        if (!input?.track_id && !input?.program_track) {
            return undefined;
        }

        if (input?.track_id) {
            const byId = await prisma.track.findFirst({
                where: { id: input.track_id, isActive: true },
                select: { id: true, name: true },
            });

            if (!byId) {
                throw ApiError.badRequest('Selected program track is invalid or inactive');
            }

            return byId;
        }

        const normalized = input.program_track?.trim();
        if (!normalized) {
            return undefined;
        }

        const byNameOrCode = await prisma.track.findFirst({
            where: {
                isActive: true,
                OR: [
                    { name: { equals: normalized, mode: 'insensitive' } },
                    { code: { equals: normalized, mode: 'insensitive' } },
                ],
            },
            select: { id: true, name: true },
        });

        if (!byNameOrCode) {
            throw ApiError.badRequest('Selected program track is invalid or inactive');
        }

        return byNameOrCode;
    }

    private async resolveActiveCampus(campusId?: string) {
        if (!campusId) {
            return undefined;
        }

        const campus = await prisma.campus.findFirst({
            where: { id: campusId, isActive: true },
            select: { id: true, name: true },
        });

        if (!campus) {
            throw ApiError.badRequest('Selected campus is invalid or inactive');
        }

        return campus;
    }

    /**
     * Get a single student profile by ID
     */
    async getStudentProfile(id: string) {
        const user = await prisma.user.findUnique({
            where: { id },
            include: {
                campus: true,
                track: true,
            }
        });

        if (!user) {
            throw new ApiError(404, 'User not found');
        }

        const stats = await dashboardService.getRevieweeProfilePerformance(id);

        // Credentials live in Supabase Auth, so this table no longer holds any
        // secret that needs stripping before serialisation.
        return {
            ...user,
            status: fromDbUserStatus(user.status),
            programTrack: resolveProgramTrack({ programTrack: user.track?.code || undefined }),
            performance: stats,
        };
    }

    /**
     * List all users with pagination and optional filters.
     */
    async listUsers(params: {
        page?: number;
        limit?: number;
        role?: Role;
        status?: string;
        search?: string;
        trackId?: string;
        campusId?: string;
        requesterRole?: 'ADMIN' | 'REVIEWER' | 'REVIEWEE';
    }) {
        const page = params.page || 1;
        const limit = params.limit || 20;
        const skip = (page - 1) * limit;

        const where: any = {};
        if (params.requesterRole === 'REVIEWER') {
            where.role = 'REVIEWEE';
        } else if (params.role) {
            where.role = params.role;
        }
        if (params.trackId) where.trackId = params.trackId;
        if (params.campusId) where.campusId = params.campusId;
        if (params.status) where.status = toDbUserStatus(params.status);
        if (params.search) {
            where.OR = [
                { firstName: { contains: params.search, mode: 'insensitive' } },
                { lastName: { contains: params.search, mode: 'insensitive' } },
                { email: { contains: params.search, mode: 'insensitive' } },
            ];
        }

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    role: true,
                    status: true,
                    trackId: true,
                    campusId: true,
                    programTrack: true,
                    yearLevel: true,
                    section: true,
                    studentId: true,
                    contactNumber: true,
                    createdAt: true,
                    track: {
                        select: { id: true, name: true, code: true },
                    },
                    campus: {
                        select: { id: true, name: true, code: true },
                    },
                },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.user.count({ where }),
        ]);

        const normalized = users.map((user) => ({
            ...user,
            name: `${user.firstName} ${user.lastName}`.trim(),
            status: fromDbUserStatus(user.status as string),
            program: user.track?.name || user.programTrack || null,
            program_track: user.track?.name || user.programTrack || null,
            track_id: user.trackId || user.track?.id || null,
            campus: user.campus?.name || null,
            campus_id: user.campusId || user.campus?.id || null,
        }));

        return { users: normalized, total, page, limit };
    }

    /**
     * Provision an external staff account and return a single-use invite link.
     *
     * No password is set here. Supabase mints the identity and an invite URL;
     * the admin passes that URL to the person out-of-band and they choose their
     * own password. The admin therefore never learns another user's credential,
     * and no SMTP provider or verified sending domain is required.
     *
     * Restricted to addresses outside the institution's Workspace. Anyone with
     * an `@cnu.edu.ph` address signs in with Google instead — enforced here as
     * well as in the validator, because this is the boundary that actually
     * grants access.
     */
    async inviteExternalUser(data: {
        email: string;
        role: Role;
    }) {
        const email = data.email.trim().toLowerCase();

        if (isInternalEmail(email)) {
            throw ApiError.badRequest(
                `@${INTERNAL_EMAIL_DOMAIN} accounts sign in with Google and cannot be invited.`
            );
        }

        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) throw ApiError.conflict('User with this email already exists');

        // Names and campus are placeholders — the invited user fills in their
        // real profile when they set their password via the invite link.

        // Step 1 — mint the Supabase identity and the invite URL.
        const { data: link, error } = await supabaseAdmin.auth.admin.generateLink({
            type: 'invite',
            email,
            options: { redirectTo: SET_PASSWORD_REDIRECT },
        });

        if (error || !link?.user?.id) {
            throw ApiError.internal(
                `Could not create the account in Supabase: ${error?.message || 'unknown error'}`
            );
        }

        const authUserId = link.user.id;

        // Step 2 — create the application account under the same id.
        //
        // These two steps are not atomic. If this insert fails we would be left
        // with an orphaned Supabase identity holding a live invite link and no
        // application account behind it, so the identity is removed again
        // before the error propagates.
        try {
            const user = await prisma.user.create({
                data: {
                    id: authUserId,
                    firstName: 'User',
                    lastName: 'Account',
                    email,
                    role: data.role,
                    status: 'ACTIVE',
                    createdByAdmin: true,
                    isExternalEmail: true,
                },
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    role: true,
                    status: true,
                    campusId: true,
                    createdAt: true,
                },
            });

            return {
                ...user,
                name: `${user.firstName} ${user.lastName}`.trim(),
                status: fromDbUserStatus(user.status as string),
                // Shown once in the admin UI. The admin is responsible for
                // delivering it over a channel they trust.
                inviteLink: link.properties?.action_link ?? null,
            };
        } catch (err) {
            await supabaseAdmin.auth.admin.deleteUser(authUserId).catch(() => undefined);
            throw err;
        }
    }

    /**
     * Generate a fresh link for an external account to set or reset its
     * password — used both when an invite expires and when someone forgets
     * their password.
     *
     * A recovery link is used in both cases: the identity already exists, so a
     * second invite would be rejected, and recovery lands on the same
     * set-password screen.
     */
    async createAccessLink(userId: string) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, isExternalEmail: true },
        });

        if (!user) throw ApiError.notFound('User not found');

        if (!user.isExternalEmail || isInternalEmail(user.email)) {
            throw ApiError.badRequest(
                'This account signs in with Google and has no password to reset.'
            );
        }

        const { data: link, error } = await supabaseAdmin.auth.admin.generateLink({
            type: 'recovery',
            email: user.email,
            options: { redirectTo: SET_PASSWORD_REDIRECT },
        });

        if (error || !link?.properties?.action_link) {
            throw ApiError.internal(
                `Could not generate an access link: ${error?.message || 'unknown error'}`
            );
        }

        return { email: user.email, accessLink: link.properties.action_link };
    }

    /**
     * Admin update of user details, email, and password.
     */
    async updateUser(userId: string, data: {
        firstName?: string;
        lastName?: string;
        middleInitial?: string;
        suffix?: string;
        track_id?: string;
        campus_id?: string;
        yearLevel?: string;
        section?: string;
    }) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw ApiError.notFound('User not found');

        // Email and password are deliberately not editable here. Both live in
        // Supabase Auth: email is the shared identity key with auth.users and
        // changing it on one side only would desynchronise the two, and
        // passwords are set by their owner via an access link
        // (see createAccessLink).

        // Build update payload with only provided fields
        const updateData: any = {};
        if (data.firstName !== undefined) updateData.firstName = data.firstName;
        if (data.lastName !== undefined) updateData.lastName = data.lastName;
        if (data.middleInitial !== undefined) updateData.middleInitial = data.middleInitial || null;
        if (data.suffix !== undefined) updateData.suffix = data.suffix || null;
        if (data.track_id !== undefined) updateData.trackId = data.track_id || null;
        if (data.campus_id !== undefined) updateData.campusId = data.campus_id || null;
        if (data.yearLevel !== undefined) updateData.yearLevel = data.yearLevel || null;
        if (data.section !== undefined) updateData.section = data.section || null;

        const updated = await prisma.user.update({
            where: { id: userId },
            data: updateData,
            include: {
                track: { select: { id: true, name: true, code: true } },
                campus: { select: { id: true, name: true, code: true } },
            },
        });

        return {
            ...updated,
            name: `${updated.firstName} ${updated.lastName}`.trim(),
            status: fromDbUserStatus(updated.status as string),
            program: updated.track?.name || updated.programTrack || null,
            program_track: updated.track?.name || updated.programTrack || null,
            track_id: updated.trackId || updated.track?.id || null,
            campus: updated.campus?.name || null,
            campus_id: updated.campusId || updated.campus?.id || null,
        };
    }

    /**
     * Update a user's status (approve/reject).
     */
    async updateUserStatus(userId: string, status: string) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw ApiError.notFound('User not found');

        const normalizedStatus = toDbUserStatus(status) as any;

        const updated = await prisma.user.update({
            where: { id: userId },
            data: { status: normalizedStatus },
            select: {
                id: true, email: true, firstName: true, lastName: true, role: true, status: true,
            },
        });

        if (normalizedStatus === 'ACTIVE' || normalizedStatus === 'DISABLED') {
            const isApproved = normalizedStatus === 'ACTIVE';
            await notificationService.createNotification({
                recipientUserId: updated.id,
                type: isApproved ? 'ACCOUNT_APPROVED' : 'ACCOUNT_REJECTED',
                title: isApproved ? 'Account Approved' : 'Account Rejected',
                message: isApproved
                    ? 'Your account has been approved. You can now access the platform.'
                    : 'Your account has been rejected or disabled. Please contact an administrator for details.',
                link: '/settings',
                entityType: 'user',
                entityId: updated.id,
                severity: isApproved ? 'INFO' : 'WARNING',
            });
        }

        return {
            ...updated,
            name: `${updated.firstName} ${updated.lastName}`.trim(),
            status: fromDbUserStatus(updated.status as string),
        };
    }

    /**
     * Update a user's role.
     */
    async updateUserRole(userId: string, role: Role) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw ApiError.notFound('User not found');

        return prisma.user.update({
            where: { id: userId },
            data: { role },
            select: {
                id: true, email: true, firstName: true, lastName: true, role: true, status: true,
            },
        });
    }

    /**
     * Delete a user.
     */
    async deleteUser(userId: string) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                role: true,
                email: true,
            },
        });
        if (!user) throw ApiError.notFound('User not found');

        const [createdExams, createdDecks, hostedConferences] = await Promise.all([
            prisma.exam.count({ where: { createdBy: userId } }),
            prisma.studyDeck.count({ where: { createdBy: userId } }),
            prisma.conference.count({ where: { hostId: userId } }),
        ]);

        if (createdExams > 0 || createdDecks > 0 || hostedConferences > 0) {
            const ownershipNotes = [
                createdExams > 0 ? `${createdExams} exam${createdExams === 1 ? '' : 's'}` : null,
                createdDecks > 0 ? `${createdDecks} study deck${createdDecks === 1 ? '' : 's'}` : null,
                hostedConferences > 0 ? `${hostedConferences} conference${hostedConferences === 1 ? '' : 's'}` : null,
            ].filter(Boolean);

            throw ApiError.conflict(
                `Cannot delete this user because they still own ${ownershipNotes.join(', ')}. Reassign or remove that content first.`
            );
        }

        await prisma.$transaction(async (tx) => {
            await tx.auditLog.deleteMany({ where: { actorId: userId } });
            await tx.user.delete({ where: { id: userId } });
        });

        // Remove the Supabase identity too, otherwise the person could still
        // authenticate and would land in the "no profile" state instead of
        // being locked out. Deliberately after the local delete and
        // non-fatal — a stranded auth.users row grants no access on its own,
        // so it is a cleanup concern rather than a security one.
        await supabaseAdmin.auth.admin.deleteUser(userId).catch(() => undefined);

        return { id: userId, email: user.email, role: user.role };
    }

    /**
     * Get user achievements based on activity.
     */
    async getAchievements(userId: string) {
        const attempts = await prisma.attempt.findMany({
            where: { userId, status: { not: 'IN_PROGRESS' } },
            select: { score: true, percentage: true, startedAt: true },
        });

        const achievements = [
            { id: '1', title: 'First Step', description: 'Take your first exam', icon: '🎓', isUnlocked: attempts.length >= 1 },
            { id: '2', title: 'Speed Demon', description: 'Complete 5 exams', icon: '⚡', isUnlocked: attempts.length >= 5 },
            { id: '3', title: 'Accuracy Master', description: '90% score 3x', icon: '🎯', isUnlocked: attempts.filter(a => Number(a.percentage || 0) >= 90).length >= 3 },
            { id: '4', title: 'Knowledge Keeper', description: 'Study 100 flashcards', icon: '📚', isUnlocked: true }, // Placeholder for now
            { id: '5', title: 'Champion', description: 'Get a perfect score', icon: '🏆', isUnlocked: attempts.some(a => Number(a.percentage || 0) === 100) },
            { id: '6', title: 'On Fire', description: '10-day study streak', icon: '🔥', isUnlocked: false }, // Logic needed for streak
            { id: '7', title: 'Subject Expert', description: 'Master a subject', icon: '📖', isUnlocked: attempts.some(a => Number(a.percentage || 0) >= 95) },
            { id: '8', title: 'Session Pro', description: 'Join 5 live sessions', icon: '🎬', isUnlocked: true }, // Placeholder
            { id: '9', title: 'Rising Star', description: '50% score improvement', icon: '🌟', isUnlocked: false },
            { id: '10', title: 'Diamond', description: 'Unlock 20 badges', icon: '💎', isUnlocked: false }
        ];

        return achievements;
    }
}

export const userService = new UserService();
