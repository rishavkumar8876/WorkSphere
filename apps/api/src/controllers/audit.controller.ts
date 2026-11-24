import { Request, Response, NextFunction } from 'express';
import { auditService } from '../services/audit.service';
import { sendSuccess } from '../utils/response';
import { AuditAction, EntityType } from '@worksphere/shared-types';

export class AuditController {
  async listLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId, action, entityType, entityId, page, limit, startDate, endDate } = req.query;

      const result = await auditService.listLogs(req.organizationId!, {
        userId: userId as string,
        action: action as AuditAction,
        entityType: entityType as EntityType,
        entityId: entityId as string,
        page: page ? parseInt(page as string, 10) : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        startDate: startDate as string,
        endDate: endDate as string,
      });

      sendSuccess(res, result.logs, 200, undefined, result.meta);
    } catch (error) {
      next(error);
    }
  }
}

export const auditController = new AuditController();
export default auditController;
