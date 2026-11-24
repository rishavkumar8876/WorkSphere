import { createApp } from './app';
import { config } from './config';
import logger from './utils/logger';
import prisma from './config/database';

const app = createApp();

const server = app.listen(config.port, () => {
  logger.info(`🚀 WorkSphere Core API running on port ${config.port} [Environment: ${config.env}]`);
  logger.info(`🔗 Base URL: http://localhost:${config.port}/api/v1`);
});

// Graceful shutdown handling
const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Initiating graceful shutdown...`);
  server.close(async () => {
    logger.info('HTTP server closed.');
    try {
      await prisma.$disconnect();
      logger.info('Database connection closed.');
      process.exit(0);
    } catch (err) {
      logger.error('Error during database disconnection:', err);
      process.exit(1);
    }
  });

  // Force close after 10 seconds if hanging
  setTimeout(() => {
    logger.error('Forced shutdown due to timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
