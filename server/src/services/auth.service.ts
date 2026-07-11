import prisma from '../config/db';
import {
    generateAccessToken,
    generateRefreshToken,
    verifyRefreshToken,
} from '../utils/jwt';
import { ApiError } from '../utils/ApiError';
import bcrypt from 'bcryptjs';
import { auditService } from './audit.service';
import { fromDbUserStatus, resolveProgramTrack } from '../utils/requirementsCompat';

const ALLOWED_DOMAIN = 'cnu.edu.ph';

// ─── Brute Force Protection ───────────────────────────
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

interface LoginAttemptRecord {
    attempts: number;
    lockedUntil: number | null;
}

const loginAttempts = new Map<string, LoginAttemptRecord>();

function checkLoginAttempts(email: string): void {
    const record = loginAttempts.get(email);
    if (!record) return;

    if (record.lockedUntil && Date.now() < record.lockedUntil) {
        const remainingMinutes = Math.ceil((record.lockedUntil - Date.now()) / 60000);
        throw ApiError.unauthorized(
            `Account temporarily locked due to too many failed attempts. Try again in ${remainingMinutes} minute(s).`
        );
    }

    // Reset if lockout has expired
    if (record.lockedUntil && Date.now() >= record.lockedUntil) {
        loginAttempts.delete(email);
    }
}

function recordFailedAttempt(email: string): void {
    const record = loginAttempts.get(email) || { attempts: 0, lockedUntil: null };
    record.attempts += 1;

    if (record.attempts >= MAX_LOGIN_ATTEMPTS) {
        record.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
    }

    loginAttempts.set(email, record);
}

function clearLoginAttempts(email: string): void {
    loginAttempts.delete(email);
}

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

    private splitName(name: string) {
        const parts = name.trim().split(/\s+/).filter(Boolean);
        const firstName = parts[0] || 'User';
        const lastName = parts.slice(1).join(' ') || 'Account';
        return { firstName, lastName };
    }

    /**
     * Register a new reviewee.
     */
    async register(data: {
        name?: string;
        firstName?: string;
        lastName?: string;
        middleInitial?: string;
        suffix?: string;
        email: string;
        password: string;
        program?: string;
        program_track?: string;
        programTrack?: string;
        track_id?: string;
        major?: string;
        campus_id?: string;
        yearLevel?: string;
        section?: string;
        picture?: string;
    }) {
        const { password } = data;
        const email = data.email.trim().toLowerCase();
        const resolvedTrack = await this.resolveActiveTrack({
            track_id: data.track_id,
            rawTrack: resolveProgramTrack(data),
        });
        const resolvedCampus = await this.resolveActiveCampus(data.campus_id);
        const resolvedName = data.name
            ? this.splitName(data.name)
            : {
                firstName: data.firstName?.trim() || 'User',
                lastName: data.lastName?.trim() || 'Account',
            };
        const middleInitial = data.middleInitial?.trim()
            ? data.middleInitial.trim()[0].toUpperCase()
            : undefined;
        const suffix = data.suffix?.trim() || undefined;
        const yearLevel = data.yearLevel?.trim() || undefined;
        const section = data.section?.trim() || undefined;

        // Enforce cnu.edu.ph domain
        if (!email.toLowerCase().endsWith(`@${ALLOWED_DOMAIN}`)) {
            throw ApiError.badRequest(`Only @${ALLOWED_DOMAIN} accounts are allowed`);
        }

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            throw ApiError.conflict('User with this email already exists');
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // New self-registered reviewees require admin approval.
        const user = await prisma.user.create({
            data: {
                firstName: resolvedName.firstName,
                lastName: resolvedName.lastName,
                middleInitial,
                suffix,
                email: email.toLowerCase(),
                passwordHash: hashedPassword,
                role: 'REVIEWEE',
                status: 'PENDING',
                trackId: resolvedTrack?.id,
                campusId: resolvedCampus?.id,
                programTrack: resolvedTrack?.name,
                yearLevel,
                section,
                profilePicture: data.picture,
            },
            include: {
                track: {
                    select: { id: true, name: true, code: true },
                },
                campus: {
                    select: { id: true, name: true, code: true },
                },
            },
        });

        await auditService.log({
            actorId: user.id,
            actorRole: user.role,
            action: 'REGISTER',
            entityType: 'user',
            entityId: user.id,
            summary: `User registered: ${user.email}`,
            metadata: {
                source: 'self-registration',
            },
        });

        return {
            user: this.sanitizeUser(user),
        };
    }

    /**
     * Login with email and password.
     */
    async login(email: string, password: string) {
        const normalizedEmail = email.trim().toLowerCase();

        // Check if account is locked due to brute force
        checkLoginAttempts(normalizedEmail);

        let user = await prisma.user.findUnique({
            where: { email: normalizedEmail },
            include: {
                track: {
                    select: { id: true, name: true, code: true },
                },
                campus: {
                    select: { id: true, name: true, code: true },
                },
            },
        });

        if (!user) {
            recordFailedAttempt(normalizedEmail);
            throw ApiError.unauthorized('Invalid email or password');
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        if (!isPasswordValid) {
            recordFailedAttempt(normalizedEmail);
            await auditService.log({
                actorId: user.id,
                actorRole: user.role,
                action: 'REJECT',
                entityType: 'auth',
                summary: `Failed login attempt: ${user.email}`,
            });
            throw ApiError.unauthorized('Invalid email or password');
        }

        // Clear failed attempts on successful login
        clearLoginAttempts(normalizedEmail);

        if (user.status === 'PENDING') {
            throw ApiError.forbidden('Your account is pending admin approval');
        }

        const currentStatus = user.status as string;
        if (currentStatus === 'REJECTED' || currentStatus === 'DISABLED') {
            throw ApiError.forbidden('Your account is disabled');
        }

        // Generate tokens
        const tokenPayload = { userId: user.id, role: user.role };
        const accessToken = generateAccessToken(tokenPayload);
        const refreshToken = generateRefreshToken(tokenPayload);

        // Store hashed refresh token
        const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
        await prisma.user.update({
            where: { id: user.id },
            data: { refreshTokenHash: hashedRefreshToken },
        });

        await auditService.log({
            actorId: user.id,
            actorRole: user.role,
            action: 'LOGIN',
            entityType: 'auth',
            summary: `User logged in: ${user.email}`,
        });

        return {
            accessToken,
            refreshToken,
            user: this.sanitizeUser(user),
        };
    }

    /**
     * Refresh access token using a valid refresh token.
     */
    async refreshAccessToken(refreshTokenValue: string) {
        const decoded = verifyRefreshToken(refreshTokenValue);

        let user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            include: {
                track: {
                    select: { id: true, name: true, code: true },
                },
                campus: {
                    select: { id: true, name: true, code: true },
                },
            },
        });

        if (!user || !user.refreshTokenHash) {
            throw ApiError.unauthorized('Invalid refresh token');
        }

        if (user.status === 'PENDING') {
            throw ApiError.forbidden('Your account is pending admin approval');
        }

        const refreshTokenHash = user.refreshTokenHash;
        if (!refreshTokenHash) {
            throw ApiError.unauthorized('Invalid refresh token');
        }

        // Verify stored refresh token matches
        const isValid = await bcrypt.compare(refreshTokenValue, refreshTokenHash);
        if (!isValid) {
            // Possible token reuse attack — invalidate all sessions for this user
            await prisma.user.update({
                where: { id: user.id },
                data: { refreshTokenHash: null },
            });
            throw ApiError.unauthorized('Invalid refresh token — all sessions revoked');
        }

        // Rotate: issue new access + refresh tokens
        const tokenPayload = { userId: user.id, role: user.role };
        const accessToken = generateAccessToken(tokenPayload);
        const newRefreshToken = generateRefreshToken(tokenPayload);

        // Store the new refresh token hash (invalidates the old one)
        const hashedNewRefreshToken = await bcrypt.hash(newRefreshToken, 10);
        await prisma.user.update({
            where: { id: user.id },
            data: { refreshTokenHash: hashedNewRefreshToken },
        });

        return { accessToken, refreshToken: newRefreshToken, user: this.sanitizeUser(user) };
    }

    /**
     * Invalidate refresh token (logout).
     */
    async logout(userId: string) {
        const user = await prisma.user.update({
            where: { id: userId },
            data: { refreshTokenHash: null },
        });

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
        let user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                track: {
                    select: { id: true, name: true, code: true },
                },
                campus: {
                    select: { id: true, name: true, code: true },
                },
            },
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
            },
            include: {
                track: {
                    select: { id: true, name: true, code: true },
                },
                campus: {
                    select: { id: true, name: true, code: true },
                },
            },
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
            include: {
                track: {
                    select: { id: true, name: true, code: true },
                },
                campus: {
                    select: { id: true, name: true, code: true },
                },
            },
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
                include: {
                    track: {
                        select: { id: true, name: true, code: true },
                    },
                    campus: {
                        select: { id: true, name: true, code: true },
                    },
                },
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
            include: {
                track: {
                    select: { id: true, name: true, code: true },
                },
                campus: {
                    select: { id: true, name: true, code: true },
                },
            },
        });

        return this.sanitizeUser(user);
    }

    /**
     * Remove sensitive fields from the user object.
     */
    private sanitizeUser(user: any) {
        const { passwordHash, refreshTokenHash, ...sanitized } = user;
        const resolvedProgram = sanitized.track?.name || sanitized.programTrack || null;
        return {
            ...sanitized,
            name: `${sanitized.firstName} ${sanitized.lastName}`.trim(),
            picture: sanitized.profilePicture || null,
            status: fromDbUserStatus(sanitized.status),
            program: resolvedProgram,
            program_track: resolvedProgram,
            track_id: sanitized.trackId || sanitized.track?.id || null,
            campus: sanitized.campus?.name || null,
            campus_id: sanitized.campusId || sanitized.campus?.id || null,
        };
    }
}

export const authService = new AuthService();
