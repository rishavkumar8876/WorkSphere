import prisma from '../config/database';
import { AuditAction, EntityType } from '@worksphere/shared-types';
import { AuditAction as PrismaAuditAction, EntityType as PrismaEntityType } from '@prisma/client';

export class AuditService {
  async listLogs(
    organizationId: string,
    options: {
      userId?: string;
      action?: AuditAction;
      entityType?: EntityType;
      entityId?: string;
      page?: number;
      limit?: number;
      startDate?: string;
      endDate?: string;
    } = {}
  ) {
    const page = options.page || 1;
    const limit = options.limit || 50;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { organizationId };

    if (options.userId) where.userId = options.userId;
    if (options.action) where.action = options.action as PrismaAuditAction;
    if (options.entityType) where.entityType = options.entityType as PrismaEntityType;
    if (options.entityId) where.entityId = options.entityId;

    if (options.startDate || options.endDate) {
      where.timestamp = {
        ...(options.startDate && { gte: new Date(options.startDate) }),
        ...(options.endDate && { lte: new Date(options.endDate) }),
      };
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
        orderBy: { timestamp: 'desc' },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      logs,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

export const auditService = new AuditService();
export default auditService;
