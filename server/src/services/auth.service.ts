import prisma from '../config/db';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { ApiError } from '../utils/ApiError';
import bcrypt from 'bcryptjs';

const ALLOWED_DOMAIN = 'cnu.edu.ph';

export class AuthService {
    /**
     * Register a new reviewee.
     */
    async register(data: { name: string; email: string; password: string }) {
        const { name, email, password } = data;

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

        // Create user with PENDING status
        const user = await prisma.user.create({
            data: {
                name,
                email: email.toLowerCase(),
                password: hashedPassword,
                role: 'REVIEWEE',
                status: 'PENDING',
            },
        });

        return this.sanitizeUser(user);
    }

    /**
     * Login with email and password.
     */
    async login(email: string, password: string) {
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            throw ApiError.unauthorized('Invalid email or password');
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw ApiError.unauthorized('Invalid email or password');
        }

        // Check status
        if (user.status === 'PENDING') {
            throw ApiError.forbidden('Your account is pending approval by an administrator');
        }

        if (user.status === 'REJECTED') {
            throw ApiError.forbidden('Your account registration has been rejected');
        }

        // Generate tokens
        const tokenPayload = { userId: user.id, role: user.role };
        const accessToken = generateAccessToken(tokenPayload);
        const refreshToken = generateRefreshToken(tokenPayload);

        // Store hashed refresh token
        const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
        await prisma.user.update({
            where: { id: user.id },
            data: { refreshToken: hashedRefreshToken },
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

        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
        });

        if (!user || !user.refreshToken) {
            throw ApiError.unauthorized('Invalid refresh token');
        }

        // Verify stored refresh token matches
        const isValid = await bcrypt.compare(refreshTokenValue, user.refreshToken);
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
            data: { refreshToken: null },
        });
    }

    /**
     * Get current user by ID.
     */
    async getCurrentUser(userId: string) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) throw ApiError.notFound('User not found');

        return this.sanitizeUser(user);
    }

    /**
     * Update current user's profile (program, major, etc.).
     */
    async updateProfile(userId: string, data: { name?: string; program?: string; major?: string; yearLevel?: string; section?: string }) {
        const user = await prisma.user.update({
            where: { id: userId },
            data,
        });

        return this.sanitizeUser(user);
    }

    /**
     * Remove sensitive fields from the user object.
     */
    private sanitizeUser(user: any) {
        const { password, refreshToken, ...sanitized } = user;
        return sanitized;
    }
}

export const authService = new AuthService();
