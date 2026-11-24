import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors';
import { sendError } from '../utils/response';
import logger from '../utils/logger';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  const requestId = res.locals.requestId as string | undefined;

  // Handle custom AppErrors (operational errors)
  if (err instanceof AppError) {
    logger.warn(`Operational Error: ${err.message}`, {
      statusCode: err.statusCode,
      errorCode: err.errorCode,
      path: req.path,
      method: req.method,
      requestId,
    });
    sendError(res, err.statusCode, err.errorCode, err.message, err.details);
    return;
  }

  // Handle Zod schema validation errors
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    logger.warn(`Validation Error on ${req.method} ${req.path}`, { formattedErrors, requestId });
    sendError(res, 400, 'VALIDATION_ERROR', 'Input validation failed', formattedErrors);
    return;
  }

  // Handle unexpected or unhandled programmer errors
  logger.error(`Unhandled Error: ${err.message}`, {
    stack: err.stack,
    path: req.path,
    method: req.method,
    requestId,
  });

  const isProduction = process.env.NODE_ENV === 'production';
  sendError(
    res,
    500,
    'INTERNAL_SERVER_ERROR',
    isProduction ? 'An unexpected internal server error occurred' : err.message,
    isProduction ? undefined : { stack: err.stack }
  );
}
