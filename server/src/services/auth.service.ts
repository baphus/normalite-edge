import prisma from '../config/db';
import {
    generateAccessToken,
    generateEmailVerificationToken,
    generateRefreshToken,
    verifyEmailVerificationToken,
    verifyRefreshToken,
} from '../utils/jwt';
import { ApiError } from '../utils/ApiError';
import bcrypt from 'bcryptjs';
import { auditService } from './audit.service';
import { fromDbUserStatus, resolveProgramTrack } from '../utils/requirementsCompat';
import { env } from '../config/env';

const ALLOWED_DOMAIN = 'cnu.edu.ph';

export class AuthService {
    private async resolveActiveProgramTrack(rawTrack?: string) {
        if (!rawTrack) {
            return undefined;
        }

        const normalized = rawTrack.trim();
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
            select: { name: true },
        });

        if (!track) {
            throw ApiError.badRequest('Selected program track is invalid or inactive');
        }

        return track.name;
    }

    private createVerificationLink(userId: string, email: string) {
        const token = generateEmailVerificationToken({
            userId,
            email,
            type: 'EMAIL_VERIFICATION',
        });
        const verificationUrl = `${env.CLIENT_URL}/verify-email?token=${encodeURIComponent(token)}`;
        return { token, verificationUrl };
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
        major?: string;
        yearLevel?: string;
        section?: string;
    }) {
        const { password } = data;
        const email = data.email.trim().toLowerCase();
        const resolvedProgram = await this.resolveActiveProgramTrack(resolveProgramTrack(data));
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
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user with ACTIVE status
        const user = await prisma.user.create({
            data: {
                firstName: resolvedName.firstName,
                lastName: resolvedName.lastName,
                middleInitial,
                suffix,
                email: email.toLowerCase(),
                passwordHash: hashedPassword,
                role: 'REVIEWEE',
                status: 'ACTIVE',
                programTrack: resolvedProgram,
            },
        });

        return this.sanitizeUser(user);
    }

    /**
     * Login with email and password.
     */
    async login(email: string, password: string) {
        const normalizedEmail = email.trim().toLowerCase();
        let user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

        if (!user) {
            throw ApiError.unauthorized('Invalid email or password');
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        if (!isPasswordValid) {
            throw ApiError.unauthorized('Invalid email or password');
        }

        // Auto-activate legacy pending accounts (verification flow disabled)
        if (user.status === 'PENDING') {
            user = await prisma.user.update({
                where: { id: user.id },
                data: { status: 'ACTIVE' },
            });
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
     * Verify reviewee email using verification token.
     */
    async verifyEmail(token: string) {
        let decoded;
        try {
            decoded = verifyEmailVerificationToken(token);
        } catch {
            throw ApiError.badRequest('Invalid or expired verification link');
        }

        if (decoded.type !== 'EMAIL_VERIFICATION') {
            throw ApiError.badRequest('Invalid verification token');
        }

        const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
        if (!user || user.email !== decoded.email) {
            throw ApiError.badRequest('Invalid verification link');
        }

        if (user.status === 'DISABLED') {
            throw ApiError.forbidden('Your account is disabled');
        }

        if (user.status === 'ACTIVE') {
            return this.sanitizeUser(user);
        }

        const updated = await prisma.user.update({
            where: { id: user.id },
            data: { status: 'ACTIVE' },
        });

        await auditService.log({
            actorId: updated.id,
            actorRole: updated.role,
            action: 'APPROVE',
            entityType: 'auth',
            summary: `Email verified for ${updated.email}`,
        });

        return this.sanitizeUser(updated);
    }

    /**
     * Resend verification link for pending reviewees.
     */
    async resendVerification(emailInput: string) {
        const email = emailInput.trim().toLowerCase();
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            return { sent: true };
        }

        if (user.status === 'DISABLED') {
            throw ApiError.forbidden('Your account is disabled');
        }

        if (user.status === 'ACTIVE') {
            return { sent: true, alreadyVerified: true };
        }

        const verification = this.createVerificationLink(user.id, user.email);
        console.log(`[Auth] Resent verification link for ${user.email}: ${verification.verificationUrl}`);

        return {
            sent: true,
            verificationUrl: verification.verificationUrl,
        };
    }

    /**
     * Refresh access token using a valid refresh token.
     */
    async refreshAccessToken(refreshTokenValue: string) {
        const decoded = verifyRefreshToken(refreshTokenValue);

        let user = await prisma.user.findUnique({
            where: { id: decoded.userId },
        });

        if (!user || !user.refreshTokenHash) {
            throw ApiError.unauthorized('Invalid refresh token');
        }

        if (user.status === 'PENDING') {
            user = await prisma.user.update({
                where: { id: user.id },
                data: { status: 'ACTIVE' },
            });
        }

        const refreshTokenHash = user.refreshTokenHash;
        if (!refreshTokenHash) {
            throw ApiError.unauthorized('Invalid refresh token');
        }

        // Verify stored refresh token matches
        const isValid = await bcrypt.compare(refreshTokenValue, refreshTokenHash);
        if (!isValid) {
            throw ApiError.unauthorized('Invalid refresh token');
        }

        const accessToken = generateAccessToken({
            userId: user.id,
            role: user.role,
        });

        return { accessToken, user: this.sanitizeUser(user) };
    }

    /**
     * Invalidate refresh token (logout).
     */
    async logout(userId: string) {
        await prisma.user.update({
            where: { id: userId },
            data: { refreshTokenHash: null },
        });
    }

    /**
     * Get current user by ID.
     */
    async getCurrentUser(userId: string) {
        let user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) throw ApiError.notFound('User not found');

        if (user.status === 'PENDING') {
            user = await prisma.user.update({
                where: { id: user.id },
                data: { status: 'ACTIVE' },
            });
        }

        return this.sanitizeUser(user);
    }

    /**
     * Update current user's profile (program, major, etc.).
     */
    async updateProfile(userId: string, data: { name?: string; program?: string; program_track?: string; programTrack?: string }) {
        const nameParts = data.name ? this.splitName(data.name) : undefined;
        const resolvedProgramTrack = await this.resolveActiveProgramTrack(resolveProgramTrack({
            program: data.program,
            program_track: data.program_track,
            programTrack: data.programTrack,
        }));
        const user = await prisma.user.update({
            where: { id: userId },
            data: {
                firstName: nameParts?.firstName,
                lastName: nameParts?.lastName,
                programTrack: resolvedProgramTrack,
            },
        });

        return this.sanitizeUser(user);
    }

    /**
     * Remove sensitive fields from the user object.
     */
    private sanitizeUser(user: any) {
        const { passwordHash, refreshTokenHash, ...sanitized } = user;
        return {
            ...sanitized,
            name: `${sanitized.firstName} ${sanitized.lastName}`.trim(),
            status: fromDbUserStatus(sanitized.status),
            program_track: sanitized.programTrack,
        };
    }
}

export const authService = new AuthService();
