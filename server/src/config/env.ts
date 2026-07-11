import dotenv from 'dotenv';
dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

// ─── Startup Validation ────────────────────────────────
// Crash immediately if critical secrets are missing in production
if (isProduction) {
    const requiredSecrets = ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'DATABASE_URL'] as const;
    const missing = requiredSecrets.filter((key) => !process.env[key]);
    if (missing.length > 0) {
        throw new Error(
            `FATAL: Missing required environment variables in production: ${missing.join(', ')}. ` +
            'The application cannot start without these values.'
        );
    }

    // Reject known weak/default secrets
    const weakSecrets = ['dev-access-secret', 'dev-refresh-secret', 'secret', 'password'];
    if (weakSecrets.includes(process.env.JWT_ACCESS_SECRET!)) {
        throw new Error('FATAL: JWT_ACCESS_SECRET is set to a known weak/default value in production.');
    }
    if (weakSecrets.includes(process.env.JWT_REFRESH_SECRET!)) {
        throw new Error('FATAL: JWT_REFRESH_SECRET is set to a known weak/default value in production.');
    }
}

export const env = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: parseInt(process.env.PORT || '5000', 10),
    HOST: process.env.HOST || (isProduction ? '0.0.0.0' : '127.0.0.1'),
    DATABASE_URL: process.env.DATABASE_URL!,
    DIRECT_URL: process.env.DIRECT_URL || '',
    JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'dev-access-secret',
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
    JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
    CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || '',
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || '',
};
