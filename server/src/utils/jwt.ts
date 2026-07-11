import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';

export interface TokenPayload {
    userId: string;
    role: string;
}

export interface EmailVerificationTokenPayload {
    userId: string;
    email: string;
    type: 'EMAIL_VERIFICATION';
}

// Explicitly restrict accepted algorithms to prevent algorithm confusion attacks
const VERIFY_OPTIONS = { algorithms: ['HS256' as const] };

/**
 * Generate an access token (short-lived).
 */
export function generateAccessToken(payload: TokenPayload): string {
    return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
        expiresIn: env.JWT_ACCESS_EXPIRES_IN,
        algorithm: 'HS256',
    } as SignOptions);
}

/**
 * Generate a refresh token (long-lived).
 */
export function generateRefreshToken(payload: TokenPayload): string {
    return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
        expiresIn: env.JWT_REFRESH_EXPIRES_IN,
        algorithm: 'HS256',
    } as SignOptions);
}

/**
 * Verify an access token.
 */
export function verifyAccessToken(token: string): TokenPayload {
    return jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: ['HS256'] }) as unknown as TokenPayload;
}

/**
 * Verify a refresh token.
 */
export function verifyRefreshToken(token: string): TokenPayload {
    return jwt.verify(token, env.JWT_REFRESH_SECRET, { algorithms: ['HS256'] }) as unknown as TokenPayload;
}

/**
 * Generate an email verification token.
 */
export function generateEmailVerificationToken(payload: EmailVerificationTokenPayload): string {
    return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
        expiresIn: '24h',
        algorithm: 'HS256',
    } as SignOptions);
}

/**
 * Verify an email verification token.
 */
export function verifyEmailVerificationToken(token: string): EmailVerificationTokenPayload {
    return jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: ['HS256'] }) as unknown as EmailVerificationTokenPayload;
}
