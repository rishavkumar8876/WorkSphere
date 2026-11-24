import { Worker, Job } from 'bullmq';
import { redisConnection } from '../queues/queue.service';
import prisma from '../config/database';
import { socketServer } from '../sockets/socket.server';
import logger from '../utils/logger';

export class WorkerService {
  private notificationWorker: Worker | null = null;
  private emailWorker: Worker | null = null;

  public start() {
    logger.info('Initializing BullMQ background workers...');

    // 1. Notification Worker
    this.notificationWorker = new Worker(
      'worksphere-notifications',
      async (job: Job) => {
        const { userId, type, title, message, data } = job.data;
        logger.info(`Processing notification job: ${job.id} for user ${userId}`);

        // Persist notification to database
        const notification = await prisma.notification.create({
          data: {
            userId,
            type,
            title,
            message,
            data: data || undefined,
          },
        });

        // Push real-time event to connected user's WebSocket
        socketServer.emitNotification(userId, notification);

        return { delivered: true, notificationId: notification.id };
      },
      { connection: redisConnection, concurrency: 5 }
    );

    this.notificationWorker.on('completed', (job) => {
      logger.info(`Notification job ${job.id} completed successfully.`);
    });

    this.notificationWorker.on('failed', (job, err) => {
      logger.error(`Notification job ${job?.id} failed with error: ${err.message}. Attempts made: ${job?.attemptsMade}`);
    });

    // 2. Email Worker
    this.emailWorker = new Worker(
      'worksphere-emails',
      async (job: Job) => {
        const { to, subject } = job.data;
        logger.info(`Processing email delivery to ${to} (Subject: ${subject})`);
        
        // Mock email delivery simulation with latency
        await new Promise((resolve) => setTimeout(resolve, 200));

        return { sent: true, recipient: to, timestamp: new Date() };
      },
      { connection: redisConnection, concurrency: 3 }
    );

    this.emailWorker.on('completed', (job) => {
      logger.info(`Email job ${job.id} sent successfully.`);
    });

    this.emailWorker.on('failed', (job, err) => {
      logger.error(`Email job ${job?.id} failed: ${err.message}`);
    });
  }

  public async close() {
    if (this.notificationWorker) await this.notificationWorker.close();
    if (this.emailWorker) await this.emailWorker.close();
    logger.info('Background workers closed.');
  }
}

export const workerService = new WorkerService();
export default workerService;
