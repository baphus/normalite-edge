import { PrismaClient } from '@prisma/client';

declare global {
    // eslint-disable-next-line no-var
    var __prisma__: PrismaClient | undefined;
}

function withPoolSettings(databaseUrl: string | undefined): string | undefined {
    if (!databaseUrl) {
        return undefined;
    }

    const isProduction = process.env.NODE_ENV === 'production';
    const connectionLimit = process.env.PRISMA_CONNECTION_LIMIT || (isProduction ? '1' : '5');
    const poolTimeout = process.env.PRISMA_POOL_TIMEOUT || (isProduction ? '30' : '20');

    try {
        const parsed = new URL(databaseUrl);
        // Keep connection pressure low in production session poolers (e.g. Supabase on Render).
        parsed.searchParams.set('connection_limit', connectionLimit);
        parsed.searchParams.set('pool_timeout', poolTimeout);
        return parsed.toString();
    } catch {
        return databaseUrl;
    }
}

const prisma = globalThis.__prisma__ ?? new PrismaClient({
    datasources: {
        db: {
            url: withPoolSettings(process.env.DATABASE_URL),
        },
    },
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
    globalThis.__prisma__ = prisma;
}

export default prisma;
