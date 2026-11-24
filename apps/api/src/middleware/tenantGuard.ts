import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@worksphere/shared-types';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';
import logger from '../utils/logger';

export function tenantGuard(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required before tenant validation', 'AUTH_REQUIRED');
  }

  // Platform Admins can inspect any organization
  if (req.user.role === UserRole.PLATFORM_ADMIN) {
    // If the request targets a specific org via header or params, set it
    const requestedOrg = (req.headers['x-organization-id'] as string) || req.params.organizationId;
    if (requestedOrg) {
      req.organizationId = requestedOrg;
    }
    next();
    return;
  }

  // Determine requested organization from header, route params, or query
  const requestedOrg =
    (req.headers['x-organization-id'] as string) ||
    req.params.organizationId ||
    (req.body && req.body.organizationId);

  // If request specifies a tenant, verify it matches the user's active tenant
  if (requestedOrg && req.user.organizationId && requestedOrg !== req.user.organizationId) {
    logger.warn('Cross-tenant access attempt blocked', {
      userId: req.user.userId,
      userTenant: req.user.organizationId,
      attemptedTenant: requestedOrg,
      path: req.originalUrl,
      method: req.method,
      ip: req.ip,
    });

    throw new ForbiddenError(
      'Cross-tenant access violation: You are not authorized to access this organization.',
      'CROSS_TENANT_FORBIDDEN'
    );
  }

  // Enforce that a non-admin user must have a valid tenant assigned
  if (!req.user.organizationId && !requestedOrg) {
    throw new ForbiddenError(
      'No active organization context found. Please select an organization.',
      'NO_TENANT_CONTEXT'
    );
  }

  req.organizationId = req.user.organizationId || requestedOrg;
  next();
}
