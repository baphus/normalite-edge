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

/**
 * Generate an access token (short-lived).
 */
export function generateAccessToken(payload: TokenPayload): string {
    return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
        expiresIn: env.JWT_ACCESS_EXPIRES_IN,
    } as SignOptions);
}

/**
 * Generate a refresh token (long-lived).
 */
export function generateRefreshToken(payload: TokenPayload): string {
    return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
        expiresIn: env.JWT_REFRESH_EXPIRES_IN,
    } as SignOptions);
}

/**
 * Verify an access token.
 */
export function verifyAccessToken(token: string): TokenPayload {
    return jwt.verify(token, env.JWT_ACCESS_SECRET) as TokenPayload;
}

/**
 * Verify a refresh token.
 */
export function verifyRefreshToken(token: string): TokenPayload {
    return jwt.verify(token, env.JWT_REFRESH_SECRET) as TokenPayload;
}

/**
 * Generate an email verification token.
 */
export function generateEmailVerificationToken(payload: EmailVerificationTokenPayload): string {
    return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
        expiresIn: '24h',
    } as SignOptions);
}

/**
 * Verify an email verification token.
 */
export function verifyEmailVerificationToken(token: string): EmailVerificationTokenPayload {
    return jwt.verify(token, env.JWT_ACCESS_SECRET) as EmailVerificationTokenPayload;
}
