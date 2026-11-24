import http from 'http';
import { createApp } from './app';
import { config } from './config';
import logger from './utils/logger';
import prisma from './config/database';
import { socketServer } from './sockets/socket.server';
import { workerService } from './workers/worker.service';

const app = createApp();
const httpServer = http.createServer(app);

// Initialize real-time Socket.IO gateway
socketServer.init(httpServer);

// Initialize background queue workers if Redis is enabled
if (process.env.NODE_ENV !== 'test') {
  try {
    workerService.start();
  } catch (err) {
    logger.warn('Worker initialization skipped:', (err as Error).message);
  }
}

const server = httpServer.listen(config.port, () => {
  logger.info(`🚀 WorkSphere Core API running on port ${config.port} [Environment: ${config.env}]`);
  logger.info(`🔗 Base REST URL: http://localhost:${config.port}/api/v1`);
  logger.info(`⚡ Realtime Socket.IO: http://localhost:${config.port}/socket.io`);
});

// Graceful shutdown handling
const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Initiating graceful shutdown...`);
  try {
    await workerService.close();
  } catch (e) {
    // Ignore worker close errors during exit
  }

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
