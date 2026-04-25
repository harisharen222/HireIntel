import { buildApp } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { prisma } from './config/prisma';

const app = buildApp();

const server = app.listen(env.PORT, () => {
  logger.info(`🚀 TalentMatch backend listening on :${env.PORT}`);
});

/**
 * Graceful shutdown — drain in-flight requests, then close DB.
 * Matters in containers: SIGTERM from Docker/K8s should let active requests finish.
 */
const shutdown = async (signal: string) => {
  logger.info({ signal }, 'shutting down');
  server.close(async () => {
    try {
      await prisma.$disconnect();
      logger.info('prisma disconnected, bye');
      process.exit(0);
    } catch (err) {
      logger.error({ err }, 'error during shutdown');
      process.exit(1);
    }
  });

  // Hard kill if the drain takes too long.
  setTimeout(() => {
    logger.error('forced shutdown after 10s');
    process.exit(1);
  }, 10_000).unref();
};

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'unhandledRejection');
});
