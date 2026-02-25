import app from './app';
import { env } from './config/env';
import prisma from './config/db';
import { logger } from './utils/logger';

async function main() {
    try {
        // Test database connection
        await prisma.$connect();
        logger.info('Connected to PostgreSQL database');

        // Start server
        app.listen(env.PORT, () => {
            logger.info(`Server running on http://localhost:${env.PORT}`);
            logger.info(`API available at http://localhost:${env.PORT}/api/v1`);
            logger.info(`Environment: ${env.NODE_ENV}`);
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
