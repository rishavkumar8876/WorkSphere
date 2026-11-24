import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { UnauthorizedError } from '../utils/errors';
import { AuthenticatedUserPayload } from '@worksphere/shared-types';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUserPayload;
      organizationId?: string;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing or invalid Authorization header', 'TOKEN_MISSING');
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwt.accessSecret) as AuthenticatedUserPayload;
    req.user = decoded;
    if (decoded.organizationId) {
      req.organizationId = decoded.organizationId;
    }
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Access token has expired', 'TOKEN_EXPIRED');
    }
    throw new UnauthorizedError('Invalid access token', 'TOKEN_INVALID');
  }
}
