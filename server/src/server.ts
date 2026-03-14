import app from './app';
import { env } from './config/env';
import prisma from './config/db';
import { logger } from './utils/logger';
import { startKeepAlive } from './utils/keepAlive';

function getHostname(urlValue: string): string {
    try {
        return new URL(urlValue).hostname.toLowerCase();
    } catch {
        return '';
    }
}

function validateDatabaseUrls() {
    const databaseHost = getHostname(env.DATABASE_URL);
    const directHost = getHostname(env.DIRECT_URL);

    if (!databaseHost) {
        logger.warn('DATABASE_URL is missing or invalid.');
        return;
    }

    const isPoolerHost = databaseHost.includes('pooler.supabase.com');
    if (!isPoolerHost) {
        logger.warn(
            `DATABASE_URL host looks non-pooled (${databaseHost}). For production traffic, prefer Supabase pooler host (*.pooler.supabase.com).`,
        );
    }

    if (!env.DIRECT_URL) {
        logger.warn('DIRECT_URL is not set. Prisma migrations may fail without a direct database host URL.');
        return;
    }

    if (!directHost) {
        logger.warn('DIRECT_URL is set but invalid. Prisma migrations may fail.');
        return;
    }

    if (directHost.includes('pooler.supabase.com')) {
        logger.warn(
            `DIRECT_URL host appears pooled (${directHost}). For migrations, prefer the direct host (db.<project-ref>.supabase.co).`,
        );
    }
}

async function main() {
    try {
        validateDatabaseUrls();

        // Test database connection
        await prisma.$connect();
        logger.info('Connected to PostgreSQL database');

        // Start server
        const server = app.listen(env.PORT, env.HOST, () => {
            logger.info(`Server running on http://${env.HOST}:${env.PORT}`);
            logger.info(`API available at http://${env.HOST}:${env.PORT}/api/v1`);
            logger.info(`Environment: ${env.NODE_ENV}`);
            
            // Start Keep-Alive Service for Render Free Tier
            if (env.NODE_ENV === 'production') {
                startKeepAlive();
            }
        });

        server.on('error', (error: NodeJS.ErrnoException) => {
            if (error.code === 'EACCES') {
                logger.error(
                    `Cannot bind to ${env.HOST}:${env.PORT} (permission denied). Try setting HOST=127.0.0.1 and/or use another PORT in server/.env (for example PORT=5001).`,
                );
            } else if (error.code === 'EADDRINUSE') {
                logger.error(
                    `Port ${env.PORT} is already in use. Choose another PORT in server/.env (for example PORT=5001).`,
                );
            } else {
                logger.error('Server failed to listen:', error);
            }

            process.exit(1);
        });
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    logger.info('Shutting down...');
    await prisma.$disconnect();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    logger.info('Shutting down...');
    await prisma.$disconnect();
    process.exit(0);
});

main();
