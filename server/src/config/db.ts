import { PrismaClient } from '@prisma/client';

declare global {
    // eslint-disable-next-line no-var
    var __prisma__: PrismaClient | undefined;
}

function withPoolSettings(databaseUrl: string | undefined): string | undefined {
    if (!databaseUrl) {
        return undefined;
    }

    try {
        const parsed = new URL(databaseUrl);
        parsed.searchParams.set('connection_limit', '5');
        parsed.searchParams.set('pool_timeout', '20');
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
