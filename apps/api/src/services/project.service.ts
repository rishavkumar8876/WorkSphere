import prisma from '../config/database';
import { NotFoundError, BadRequestError } from '../utils/errors';
import { ProjectStatus, MilestoneStatus, AuditAction, EntityType } from '@worksphere/shared-types';
import { ProjectStatus as PrismaProjectStatus, MilestoneStatus as PrismaMilestoneStatus } from '@prisma/client';

export class ProjectService {
  async listProjects(
    organizationId: string,
    options: {
      status?: ProjectStatus;
      search?: string;
      page?: number;
      limit?: number;
    } = {}
  ) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const where: {
      organizationId: string;
      status?: PrismaProjectStatus;
      name?: { contains: string; mode: 'insensitive' };
    } = { organizationId };

    if (options.status) {
      where.status = options.status as PrismaProjectStatus;
    }

    if (options.search) {
      where.name = { contains: options.search, mode: 'insensitive' };
    }

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        skip,
        take: limit,
        include: {
          owner: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          _count: {
            select: {
              tasks: true,
              milestones: true,
              members: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.project.count({ where }),
    ]);

    return {
      projects,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async createProject(
    organizationId: string,
    userId: string,
    data: {
      name: string;
      key: string;
      description?: string;
      status?: ProjectStatus;
      startDate?: string;
      targetDate?: string;
    }
  ) {
    // Unique key check within this tenant
    const existingKey = await prisma.project.findUnique({
      where: {
        organizationId_key: {
          organizationId,
          key: data.key,
        },
      },
    });

    if (existingKey) {
      throw new BadRequestError(`A project with key '${data.key}' already exists in your organization.`);
    }

    const project = await prisma.$transaction(async (tx) => {
      const created = await tx.project.create({
        data: {
          organizationId,
          name: data.name,
          key: data.key,
          description: data.description,
          status: (data.status as PrismaProjectStatus) || PrismaProjectStatus.ACTIVE,
          startDate: data.startDate ? new Date(data.startDate) : null,
          targetDate: data.targetDate ? new Date(data.targetDate) : null,
          ownerId: userId,
        },
      });

      // Add creator as project lead
      await tx.projectMember.create({
        data: {
          projectId: created.id,
          userId,
          role: 'LEAD',
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          userId,
          action: AuditAction.CREATE,
          entityType: EntityType.PROJECT,
          entityId: created.id,
          newValues: { name: created.name, key: created.key },
        },
      });

      return created;
    });

    return project;
  }

  async getProject(organizationId: string, projectId: string) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, organizationId },
      include: {
        owner: { select: { id: true, firstName: true, lastName: true, email: true } },
        members: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
          },
        },
        milestones: { orderBy: { dueDate: 'asc' } },
        _count: {
          select: { tasks: true },
        },
      },
    });

    if (!project) {
      throw new NotFoundError('Project not found in this organization');
    }

    return project;
  }

  async updateProject(
    organizationId: string,
    projectId: string,
    userId: string,
    data: {
      name?: string;
      description?: string;
      status?: ProjectStatus;
      startDate?: string | null;
      targetDate?: string | null;
    }
  ) {
    const existing = await prisma.project.findFirst({
      where: { id: projectId, organizationId },
    });

    if (!existing) {
      throw new NotFoundError('Project not found in this organization');
    }

    const updated = await prisma.$transaction(async (tx) => {
      const proj = await tx.project.update({
        where: { id: projectId },
        data: {
          ...(data.name && { name: data.name }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.status && { status: data.status as PrismaProjectStatus }),
          ...(data.startDate !== undefined && {
            startDate: data.startDate ? new Date(data.startDate) : null,
          }),
          ...(data.targetDate !== undefined && {
            targetDate: data.targetDate ? new Date(data.targetDate) : null,
          }),
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          userId,
          action: AuditAction.UPDATE,
          entityType: EntityType.PROJECT,
          entityId: projectId,
          oldValues: { name: existing.name, status: existing.status },
          newValues: { name: proj.name, status: proj.status },
        },
      });

      return proj;
    });

    return updated;
  }

  async deleteProject(organizationId: string, projectId: string, userId: string) {
    const existing = await prisma.project.findFirst({
      where: { id: projectId, organizationId },
    });

    if (!existing) {
      throw new NotFoundError('Project not found in this organization');
    }

    // Soft delete / archive
    const archived = await prisma.$transaction(async (tx) => {
      const proj = await tx.project.update({
        where: { id: projectId },
        data: { status: PrismaProjectStatus.ARCHIVED },
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          userId,
          action: AuditAction.DELETE,
          entityType: EntityType.PROJECT,
          entityId: projectId,
        },
      });

      return proj;
    });

    return archived;
  }

  async createMilestone(
    organizationId: string,
    projectId: string,
    data: {
      title: string;
      description?: string;
      status?: MilestoneStatus;
      dueDate?: string;
    }
  ) {
    // Verify project belongs to organization
    const project = await prisma.project.findFirst({
      where: { id: projectId, organizationId },
    });

    if (!project) {
      throw new NotFoundError('Project not found in this organization');
    }

    return prisma.milestone.create({
      data: {
        organizationId,
        projectId,
        title: data.title,
        description: data.description,
        status: (data.status as PrismaMilestoneStatus) || PrismaMilestoneStatus.NOT_STARTED,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
      },
    });
  }

  async listMilestones(organizationId: string, projectId: string) {
    return prisma.milestone.findMany({
      where: { organizationId, projectId },
      include: {
        _count: {
          select: { tasks: true },
        },
      },
      orderBy: { dueDate: 'asc' },
    });
  }
}

export const projectService = new ProjectService();
export default projectService;
