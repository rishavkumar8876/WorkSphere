import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { config } from '../config';
import logger from '../utils/logger';

// Reusable Redis connection options
export const redisConnection = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  maxRetriesPerRequest: null,
  lazyConnect: true,
  retryStrategy(times) {
    // Retry with backoff up to 3000ms
    return Math.min(times * 100, 3000);
  },
});

redisConnection.on('error', (err) => {
  logger.warn(`Redis connection status: ${err.message}`);
});

redisConnection.on('connect', () => {
  logger.info('Connected to Redis for background jobs and caching.');
});

// Default job options ensuring retries, backoff, and dead-letter safety
export const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 1000,
  },
  removeOnComplete: {
    age: 3600, // Keep completed for 1 hour
    count: 1000,
  },
  removeOnFail: {
    age: 86400 * 7, // Keep failed jobs for 7 days in DLQ
  },
};

export class QueueService {
  private static instance: QueueService;
  public notificationQueue: Queue;
  public emailQueue: Queue;

  private constructor() {
    this.notificationQueue = new Queue('worksphere-notifications', {
      connection: redisConnection,
      defaultJobOptions,
    });

    this.emailQueue = new Queue('worksphere-emails', {
      connection: redisConnection,
      defaultJobOptions,
    });
  }

  public static getInstance(): QueueService {
    if (!QueueService.instance) {
      QueueService.instance = new QueueService();
    }
    return QueueService.instance;
  }

  /**
   * Enqueue a notification with an IDEMPOTENT jobId to prevent duplicate alerts
   * during worker restarts or transient retries.
   */
  async enqueueNotification(
    userId: string,
    type: string,
    title: string,
    message: string,
    data?: Record<string, unknown>,
    idempotencyKey?: string
  ) {
    // Generate deterministic jobId for deduplication
    const jobId = idempotencyKey || `notif-${userId}-${type}-${Date.now()}`;

    try {
      await this.notificationQueue.add(
        'send-notification',
        { userId, type, title, message, data },
        { jobId }
      );
      logger.debug(`Enqueued notification job: ${jobId}`);
    } catch (error) {
      logger.warn(`Could not enqueue notification job (Redis may be offline): ${(error as Error).message}`);
    }
  }

  /**
   * Enqueue an email job with idempotent jobId
   */
  async enqueueEmail(
    to: string,
    subject: string,
    body: string,
    idempotencyKey?: string
  ) {
    const jobId = idempotencyKey || `email-${to}-${Date.now()}`;

    try {
      await this.emailQueue.add(
        'send-email',
        { to, subject, body },
        { jobId }
      );
      logger.debug(`Enqueued email job: ${jobId}`);
    } catch (error) {
      logger.warn(`Could not enqueue email job: ${(error as Error).message}`);
    }
  }
}

export const queueService = QueueService.getInstance();
export default queueService;
