import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@worksphere/shared-types';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError('User authentication required', 'AUTH_REQUIRED');
    }

    // Platform administrators have global override permissions
    if (req.user.role === UserRole.PLATFORM_ADMIN) {
      next();
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new ForbiddenError(
        `Access denied. Role '${req.user.role}' is not authorized for this resource.`,
        'INSUFFICIENT_PERMISSIONS'
      );
    }

    next();
  };
}
