import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import { config } from './config';
import v1Routes from './routes/v1';
import { errorHandler } from './middleware/errorHandler';
import { NotFoundError } from './utils/errors';
import logger from './utils/logger';

export function createApp(): express.Application {
  const app = express();

  // 1. Security middleware
  app.use(helmet());
  app.use(
    cors({
      origin: config.corsOrigin,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-organization-id', 'x-request-id'],
    })
  );

  // 2. Request parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // 3. Request ID and context tracking
  app.use((req: Request, res: Response, next: NextFunction) => {
    const requestId = (req.headers['x-request-id'] as string) || uuidv4();
    res.locals.requestId = requestId;
    res.setHeader('x-request-id', requestId);
    next();
  });

  // 4. Request logging
  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      const logLevel = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
      logger.log(logLevel, `${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`, {
        requestId: res.locals.requestId,
        ip: req.ip,
      });
    });
    next();
  });

  // 5. Basic health checks
  app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.get('/ready', (req: Request, res: Response) => {
    res.status(200).json({ status: 'ready', uptime: process.uptime() });
  });

  // 6. Versioned API routes
  app.use('/api/v1', v1Routes);

  // 7. 404 Route Not Found
  app.use((req: Request, res: Response, next: NextFunction) => {
    next(new NotFoundError(`Route ${req.method} ${req.originalUrl} not found`));
  });

  // 8. Centralized error handling
  app.use(errorHandler);

  return app;
}

export default createApp;
