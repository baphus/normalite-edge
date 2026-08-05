// Must be the first import: PrismaPg is constructed at module top-level from
// process.env.DATABASE_URL, and entrypoints like prisma/seed.ts import this
// module before env.ts ever runs. Without this, the client silently falls back
// to libpq defaults (OS username as both user and database) when nothing
// preloaded .env.
import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

declare global {
    // eslint-disable-next-line no-var
    var __prisma__: PrismaClient | undefined;
}

function getPoolConfig() {
    const isProduction = process.env.NODE_ENV === 'production';
    const max = parseInt(process.env.PRISMA_CONNECTION_LIMIT || (isProduction ? '1' : '5'), 10);
    const idleTimeoutMillis = parseInt(process.env.PRISMA_POOL_TIMEOUT || (isProduction ? '30' : '20'), 10) * 1000;

    return { max, idleTimeoutMillis };
}

const adapter = new PrismaPg(
    {
        connectionString: process.env.DATABASE_URL,
        ...getPoolConfig(),
    },
);

const prisma = globalThis.__prisma__ ?? new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
    globalThis.__prisma__ = prisma;
}

export default prisma;
