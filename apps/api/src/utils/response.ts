import { Response } from 'express';
import { ApiResponse } from '@worksphere/shared-types';

export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode: number = 200,
  message?: string,
  meta?: ApiResponse<T>['meta']
): Response {
  const body: ApiResponse<T> = {
    success: true,
    data,
    ...(message && { message }),
    ...(meta && { meta }),
    requestId: (res.locals.requestId as string) || undefined,
  };
  return res.status(statusCode).json(body);
}

export function sendError(
  res: Response,
  statusCode: number,
  errorCode: string,
  message: string,
  details?: unknown
): Response {
  const body: ApiResponse = {
    success: false,
    error: {
      code: errorCode,
      message,
      ...(details !== undefined && { details }),
    },
    requestId: (res.locals.requestId as string) || undefined,
  };
  return res.status(statusCode).json(body);
}
