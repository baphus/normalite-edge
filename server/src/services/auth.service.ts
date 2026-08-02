import prisma from '../config/db';
import { ApiError } from '../utils/ApiError';
import { auditService } from './audit.service';
import { fromDbUserStatus, resolveProgramTrack } from '../utils/requirementsCompat';
import { importRemoteAvatar } from '../utils/importRemoteAvatar';
import { isInternalEmail, INTERNAL_EMAIL_DOMAIN } from '../config/env';
import { isGoogleIdentity, type SupabaseIdentity } from '../utils/supabaseJwt';
import type { AppUser } from '../middleware/authenticate';

const USER_INCLUDE = {
    track: {
        select: { id: true, name: true, code: true },
    },
    campus: {
        select: { id: true, name: true, code: true },
    },
} as const;

export class AuthService {
    private async resolveActiveTrack(input?: { track_id?: string; rawTrack?: string }) {
        if (!input?.track_id && !input?.rawTrack) {
            return undefined;
        }

        if (input?.track_id) {
            const track = await prisma.track.findFirst({
                where: { id: input.track_id, isActive: true },
                select: { id: true, name: true },
            });

            if (!track) {
                throw ApiError.badRequest('Selected program track is invalid or inactive');
            }

            return track;
        }

        const normalized = input?.rawTrack?.trim();
        if (!normalized) {
            return undefined;
        }

        const track = await prisma.track.findFirst({
            where: {
                isActive: true,
                OR: [
                    { name: { equals: normalized, mode: 'insensitive' } },
                    { code: { equals: normalized, mode: 'insensitive' } },
                ],
            },
            select: { id: true, name: true },
        });

        if (!track) {
            throw ApiError.badRequest('Selected program track is invalid or inactive');
        }

        return track;
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
     * The avatar the provider already has for this identity, if we trust it.
     *
     * Surfaced to the client so the profile form can show it as the default
     * rather than a blank placeholder — someone signing up with Google should
     * see the picture they already have, and choose whether to keep it.
     */
    private providerAvatar(identity: SupabaseIdentity): string | null {
        return identity.pictureUrl ? importRemoteAvatar(identity.pictureUrl) : null;
    }

    private splitName(name: string) {
        const parts = name.trim().split(/\s+/).filter(Boolean);
        const firstName = parts[0] || 'User';
        const lastName = parts.slice(1).join(' ') || 'Account';
        return { firstName, lastName };
    }

    /**
     * Report the caller's authentication state.
     *
     * Returns 200 whether or not a profile exists. This is deliberate: a
     * freshly signed-in Google user has a valid session but no application
     * account yet, and answering that with a 401 would send the client's
     * refresh interceptor into a loop against a session that is perfectly
     * valid. The client reads `profileComplete` and routes accordingly.
     */
    async getAuthState(identity: SupabaseIdentity) {
        const user = await prisma.user.findUnique({
            where: { id: identity.id },
            include: USER_INCLUDE,
        });

        if (!user) {
            const suggestedName = identity.fullName
                ? this.splitName(identity.fullName)
                : null;

            // Whether this identity may create a profile at all. Surfaced so
            // the client can explain the actual problem rather than letting
            // someone fill in a form that will be rejected on submit.
            const wrongDomain = !isInternalEmail(identity.email);
            const wrongProvider = !wrongDomain && !isGoogleIdentity(identity);

            const eligible = !wrongDomain && !wrongProvider;

            return {
                profileComplete: false,
                email: identity.email,
                eligible,
                ineligibleReason: wrongDomain ? 'domain' : wrongProvider ? 'provider' : null,
                suggested: {
                    firstName: suggestedName?.firstName ?? null,
                    lastName: suggestedName?.lastName ?? null,
                    picture: this.providerAvatar(identity),
                },
                // New Google SSO users are always REVIEWEE; surface the role
                // so the CompleteProfilePage renders the full form (campus,
                // track, year, section).
                role: eligible ? 'REVIEWEE' as const : undefined,
                user: null,
            };
        }

        if (user.status === 'DISABLED') {
            throw ApiError.forbidden('Account is disabled');
        }

        // Invited users created by an admin have placeholder names until
        // they complete their profile via the invite link.
        const profileComplete = !user.createdByAdmin ||
            (user.firstName !== 'User' || user.lastName !== 'Account');

        return {
            profileComplete,
            email: user.email,
            eligible: true,
            ineligibleReason: null,
            // Only meaningful while the profile is still being filled in. Names
            // stay null on purpose: an invited user's placeholders are exactly
            // what the form is asking them to replace, so suggesting them back
            // would be worse than suggesting nothing.
            suggested: profileComplete
                ? null
                : {
                    firstName: null,
                    lastName: null,
                    picture: user.profilePicture ?? this.providerAvatar(identity),
                },
            role: user.role,
            user: profileComplete ? this.sanitizeUser(user) : null,
        };
    }

    /**
     * Complete a user's profile after authentication.
     *
     * Handles two distinct flows:
     * 1. Google SSO users: Creates a new application account (no row exists yet).
     * 2. Invited users: Updates the placeholder profile created by the admin.
     *
     * For Google accounts, the @cnu.edu.ph restriction is enforced here.
     */
    async completeProfile(identity: SupabaseIdentity, data: {
        firstName?: string;
        lastName?: string;
        middleInitial?: string;
        suffix?: string;
        picture?: string;
        track_id?: string;
        program?: string;
        program_track?: string;
        programTrack?: string;
        campus_id?: string;
        yearLevel?: string;
        section?: string;
        studentId?: string;
        contactNumber?: string;
    }) {
        const existingById = await prisma.user.findUnique({ where: { id: identity.id } });

        // ── Invited user completing their profile ────────────────────────
        // The admin already created a Supabase identity + application row
        // with placeholder names. The user now fills in their real details.
        if (existingById && existingById.createdByAdmin) {
            const resolvedTrack = await this.resolveActiveTrack({
                track_id: data.track_id,
                rawTrack: resolveProgramTrack(data),
            });
            const resolvedCampus = await this.resolveActiveCampus(data.campus_id);

            const middleInitial = data.middleInitial?.trim()
                ? data.middleInitial.trim()[0].toUpperCase()
                : existingById.middleInitial;

            const user = await prisma.user.update({
                where: { id: identity.id },
                data: {
                    firstName: data.firstName?.trim() || existingById.firstName,
                    lastName: data.lastName?.trim() || existingById.lastName,
                    middleInitial,
                    suffix: data.suffix?.trim() || existingById.suffix,
                    profilePicture: data.picture
                        || existingById.profilePicture
                        || this.providerAvatar(identity),
                    trackId: resolvedTrack?.id ?? existingById.trackId,
                    campusId: resolvedCampus?.id ?? existingById.campusId,
                    programTrack: resolvedTrack?.name ?? existingById.programTrack,
                    yearLevel: data.yearLevel?.trim() || existingById.yearLevel,
                    section: data.section?.trim() || existingById.section,
                    studentId: data.studentId?.trim() || existingById.studentId,
                    contactNumber: data.contactNumber?.trim() || existingById.contactNumber,
                },
                include: USER_INCLUDE,
            });

            await auditService.log({
                actorId: user.id,
                actorRole: user.role,
                action: 'UPDATE',
                entityType: 'user',
                entityId: user.id,
                summary: `Profile completed: ${user.email}`,
                metadata: { source: 'invite-link' },
            });

            return this.sanitizeUser(user);
        }

        // ── Google SSO user registering for the first time ───────────────
        if (!isInternalEmail(identity.email)) {
            throw ApiError.forbidden(
                `Only @${INTERNAL_EMAIL_DOMAIN} accounts can register. ` +
                'External accounts are created by an administrator.'
            );
        }

        if (!isGoogleIdentity(identity)) {
            throw ApiError.forbidden(
                `@${INTERNAL_EMAIL_DOMAIN} accounts must sign in with Google.`
            );
        }

        if (existingById) {
            throw ApiError.conflict('Profile already exists for this account');
        }

        const existingByEmail = await prisma.user.findUnique({
            where: { email: identity.email },
        });
        if (existingByEmail) {
            throw ApiError.conflict(
                'An account already exists for this email address. Contact an administrator.'
            );
        }

        const resolvedTrack = await this.resolveActiveTrack({
            track_id: data.track_id,
            rawTrack: resolveProgramTrack(data),
        });
        const resolvedCampus = await this.resolveActiveCampus(data.campus_id);

        const middleInitial = data.middleInitial?.trim()
            ? data.middleInitial.trim()[0].toUpperCase()
            : undefined;

        const profilePicture = data.picture || this.providerAvatar(identity);

        const user = await prisma.user.create({
            data: {
                id: identity.id,
                firstName: data.firstName?.trim() || 'User',
                lastName: data.lastName?.trim() || 'Account',
                middleInitial,
                suffix: data.suffix?.trim() || undefined,
                email: identity.email,
                role: 'REVIEWEE',
                status: 'ACTIVE',
                trackId: resolvedTrack?.id ?? null,
                campusId: resolvedCampus?.id ?? null,
                programTrack: resolvedTrack?.name,
                yearLevel: data.yearLevel?.trim() || undefined,
                section: data.section?.trim() || undefined,
                studentId: data.studentId?.trim() || undefined,
                contactNumber: data.contactNumber?.trim() || undefined,
                profilePicture: profilePicture ?? undefined,
                isExternalEmail: false,
            },
            include: USER_INCLUDE,
        });

        await auditService.log({
            actorId: user.id,
            actorRole: user.role,
            action: 'REGISTER',
            entityType: 'user',
            entityId: user.id,
            summary: `User registered: ${user.email}`,
            metadata: {
                source: 'google-sso',
                provider: identity.provider,
            },
        });

        return this.sanitizeUser(user);
    }

    /**
     * Record a sign-in.
     *
     * Authentication happens between the browser and Supabase, so this service
     * never observes it directly. The client reports a new session here so the
     * application audit log still carries LOGIN events — Supabase's own auth
     * logs are not a substitute, since free-tier retention is far too short to
     * serve as evidence.
     *
     * Best-effort by nature: a client that skips this call simply produces no
     * record.
     */
    async recordSessionStart(user: AppUser, provider: string | null) {
        await auditService.log({
            actorId: user.userId,
            actorRole: user.role,
            action: 'LOGIN',
            entityType: 'auth',
            summary: `User logged in: ${user.email}`,
            metadata: { provider },
        });
    }

    /**
     * Record a sign-out. The session itself is ended client-side by Supabase.
     */
    async logout(userId: string) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, role: true },
        });

        if (!user) return;

        await auditService.log({
            actorId: user.id,
            actorRole: user.role,
            action: 'LOGOUT',
            entityType: 'auth',
            summary: `User logged out: ${user.email}`,
        });
    }

    /**
     * Get current user by ID.
     */
    async getCurrentUser(userId: string) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: USER_INCLUDE,
        });

        if (!user) throw ApiError.notFound('User not found');

        return this.sanitizeUser(user);
    }

    /**
     * Update current user's profile (program, major, etc.).
     */
    async updateProfile(userId: string, data: {
        name?: string;
        firstName?: string;
        lastName?: string;
        middleInitial?: string;
        suffix?: string;
        picture?: string;
        program?: string;
        program_track?: string;
        programTrack?: string;
        track_id?: string;
        campus_id?: string;
        yearLevel?: string;
        section?: string;
        studentId?: string;
        contactNumber?: string;
    }) {
        const nameParts = data.name ? this.splitName(data.name) : undefined;
        const firstName = nameParts?.firstName ?? (data.firstName !== undefined ? data.firstName.trim() : undefined);
        const lastName = nameParts?.lastName ?? (data.lastName !== undefined ? data.lastName.trim() : undefined);
        const middleInitial = data.middleInitial !== undefined
            ? (data.middleInitial.trim() ? data.middleInitial.trim()[0].toUpperCase() : null)
            : undefined;
        const suffix = data.suffix !== undefined ? (data.suffix.trim() || null) : undefined;
        const hasTrackInput = data.track_id !== undefined
            || data.program !== undefined
            || data.program_track !== undefined
            || data.programTrack !== undefined;
        const resolvedTrack = hasTrackInput
            ? await this.resolveActiveTrack({
                track_id: data.track_id,
                rawTrack: resolveProgramTrack({
                    program: data.program,
                    program_track: data.program_track,
                    programTrack: data.programTrack,
                }),
            })
            : undefined;
        const hasCampusInput = data.campus_id !== undefined;
        const resolvedCampus = hasCampusInput
            ? await this.resolveActiveCampus(data.campus_id)
            : undefined;
        const user = await prisma.user.update({
            where: { id: userId },
            data: {
                firstName,
                lastName,
                middleInitial,
                suffix,
                profilePicture: data.picture,
                trackId: hasTrackInput ? resolvedTrack?.id || null : undefined,
                campusId: hasCampusInput ? resolvedCampus?.id || null : undefined,
                programTrack: hasTrackInput ? resolvedTrack?.name || null : undefined,
                yearLevel: data.yearLevel !== undefined ? (data.yearLevel?.trim() || null) : undefined,
                section: data.section !== undefined ? (data.section?.trim() || null) : undefined,
                studentId: data.studentId !== undefined ? (data.studentId?.trim() || null) : undefined,
                contactNumber: data.contactNumber !== undefined ? (data.contactNumber?.trim() || null) : undefined,
            },
            include: USER_INCLUDE,
        });

        await auditService.log({
            actorId: user.id,
            actorRole: user.role,
            action: 'UPDATE',
            entityType: 'user',
            entityId: user.id,
            summary: `Profile updated: ${user.email}`,
            metadata: {
                title: user.email,
            },
        });

        return this.sanitizeUser(user);
    }

    async completeOnboarding(userId: string, data: { picture?: string }) {
        const existing = await prisma.user.findUnique({
            where: { id: userId },
            select: { role: true },
        });

        if (!existing) {
            throw ApiError.notFound('User not found');
        }

        if (existing.role !== 'REVIEWEE') {
            throw ApiError.forbidden('Onboarding is only available for reviewees');
        }

        const user = await prisma.user.update({
            where: { id: userId },
            data: {
                isOnboarded: true,
                profilePicture: data.picture !== undefined ? data.picture : undefined,
            },
            include: USER_INCLUDE,
        });

        await auditService.log({
            actorId: user.id,
            actorRole: user.role,
            action: 'UPDATE',
            entityType: 'user',
            entityId: user.id,
            summary: `Onboarding completed: ${user.email}`,
            metadata: {
                title: user.email,
            },
        });

        return this.sanitizeUser(user);
    }

    async completeTour(userId: string, tourId: string) {
        const normalizedTourId = tourId.trim();

        if (!normalizedTourId) {
            throw ApiError.badRequest('tourId is required');
        }

        const existing = await prisma.user.findUnique({
            where: { id: userId },
            select: { role: true, completedTours: true },
        });

        if (!existing) {
            throw ApiError.notFound('User not found');
        }

        if (existing.role !== 'REVIEWEE') {
            throw ApiError.forbidden('Guided tours are only available for reviewees');
        }

        if (existing.completedTours?.includes(normalizedTourId)) {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                include: USER_INCLUDE,
            });

            if (!user) {
                throw ApiError.notFound('User not found');
            }

            return this.sanitizeUser(user);
        }

        const user = await prisma.user.update({
            where: { id: userId },
            data: {
                completedTours: {
                    push: normalizedTourId,
                },
            },
            include: USER_INCLUDE,
        });

        return this.sanitizeUser(user);
    }

    /**
     * Shape the user object for API responses.
     *
     * Credentials no longer live in this table, so there is nothing secret
     * left to strip — the mapping below exists to preserve the field names the
     * client already consumes.
     */
    private sanitizeUser(user: any) {
        const resolvedProgram = user.track?.name || user.programTrack || null;
        return {
            ...user,
            name: `${user.firstName} ${user.lastName}`.trim(),
            picture: user.profilePicture || null,
            status: fromDbUserStatus(user.status),
            program: resolvedProgram,
            program_track: resolvedProgram,
            track_id: user.trackId || user.track?.id || null,
            campus: user.campus?.name || null,
            campus_id: user.campusId || user.campus?.id || null,
        };
    }
}

export const authService = new AuthService();
