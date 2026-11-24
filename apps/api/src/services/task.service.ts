import prisma from '../config/database';
import { NotFoundError, VersionConflictError, BadRequestError } from '../utils/errors';
import {
  TaskStatus,
  TaskPriority,
  AuditAction,
  EntityType,
} from '@worksphere/shared-types';
import {
  TaskStatus as PrismaTaskStatus,
  TaskPriority as PrismaTaskPriority,
} from '@prisma/client';
import logger from '../utils/logger';

export class TaskService {
  /**
   * List tasks for the active tenant with rich filtering, search, and pagination.
   */
  async listTasks(
    organizationId: string,
    options: {
      projectId?: string;
      milestoneId?: string;
      assigneeId?: string;
      status?: TaskStatus;
      priority?: TaskPriority;
      search?: string;
      page?: number;
      limit?: number;
      sortBy?: 'createdAt' | 'updatedAt' | 'dueDate' | 'priority' | 'status';
      sortOrder?: 'asc' | 'desc';
    } = {}
  ) {
    const page = options.page || 1;
    const limit = options.limit || 50;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { organizationId };

    if (options.projectId) where.projectId = options.projectId;
    if (options.milestoneId) where.milestoneId = options.milestoneId;
    if (options.assigneeId) where.assigneeId = options.assigneeId;
    if (options.status) where.status = options.status as PrismaTaskStatus;
    if (options.priority) where.priority = options.priority as PrismaTaskPriority;

    if (options.search) {
      where.OR = [
        { title: { contains: options.search, mode: 'insensitive' } },
        { description: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    const orderByField = options.sortBy || 'createdAt';
    const orderByDirection = options.sortOrder || 'desc';

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        skip,
        take: limit,
        include: {
          assignee: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
          reporter: { select: { id: true, firstName: true, lastName: true, email: true } },
          project: { select: { id: true, name: true, key: true } },
          milestone: { select: { id: true, title: true } },
          _count: {
            select: { subtasks: true, comments: true, attachments: true },
          },
        },
        orderBy: { [orderByField]: orderByDirection },
      }),
      prisma.task.count({ where }),
    ]);

    return {
      tasks,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Create a new task within a project. Sets initial version = 1.
   */
  async createTask(
    organizationId: string,
    reporterId: string,
    data: {
      projectId: string;
      milestoneId?: string;
      title: string;
      description?: string;
      status?: TaskStatus;
      priority?: TaskPriority;
      assigneeId?: string;
      dueDate?: string;
    }
  ) {
    // Verify project belongs to tenant
    const project = await prisma.project.findFirst({
      where: { id: data.projectId, organizationId },
    });

    if (!project) {
      throw new BadRequestError('Target project does not exist in this organization.');
    }

    const task = await prisma.$transaction(async (tx) => {
      const created = await tx.task.create({
        data: {
          organizationId,
          projectId: data.projectId,
          milestoneId: data.milestoneId || null,
          title: data.title,
          description: data.description || null,
          status: (data.status as PrismaTaskStatus) || PrismaTaskStatus.TODO,
          priority: (data.priority as PrismaTaskPriority) || PrismaTaskPriority.MEDIUM,
          assigneeId: data.assigneeId || null,
          reporterId,
          version: 1, // Initial OCC version
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
        },
        include: {
          assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
          project: { select: { id: true, name: true, key: true } },
        },
      });

      // Record Activity Event
      await tx.activityEvent.create({
        data: {
          organizationId,
          taskId: created.id,
          userId: reporterId,
          action: 'TASK_CREATED',
          details: { title: created.title, status: created.status, priority: created.priority },
        },
      });

      // Record Compliance Audit Log
      await tx.auditLog.create({
        data: {
          organizationId,
          userId: reporterId,
          action: AuditAction.CREATE,
          entityType: EntityType.TASK,
          entityId: created.id,
          newValues: { title: created.title, status: created.status },
        },
      });

      return created;
    });

    logger.info(`Task created: ${task.id} (version: 1)`, { taskId: task.id, organizationId });
    return task;
  }

  /**
   * Get single task by ID with subtasks, comments, attachments, and current version.
   */
  async getTask(organizationId: string, taskId: string) {
    const task = await prisma.task.findFirst({
      where: { id: taskId, organizationId },
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
        reporter: { select: { id: true, firstName: true, lastName: true, email: true } },
        project: { select: { id: true, name: true, key: true } },
        milestone: { select: { id: true, title: true } },
        subtasks: { orderBy: { position: 'asc' } },
        comments: {
          include: {
            author: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        attachments: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!task) {
      throw new NotFoundError('Task not found in this organization');
    }

    return task;
  }

  /**
   * CAPSTONE REQUIREMENT: Optimistic Concurrency Control (OCC) Task Update
   *
   * Algorithm:
   * 1. Retrieve the existing task with current version.
   * 2. Verify that expectedVersion === existing.version.
   *    If mismatch: THROW 409 Conflict with the fresh task data.
   * 3. Perform an atomic update matching BOTH id AND version:
   *    UPDATE tasks SET ..., version = version + 1 WHERE id = taskId AND version = expectedVersion
   * 4. If 0 rows updated (race condition caught at DB level): THROW 409 Conflict.
   * 5. Record activity event, write audit log, and return the newly bumped version.
   */
  async updateTask(
    organizationId: string,
    taskId: string,
    userId: string,
    data: {
      title?: string;
      description?: string;
      status?: TaskStatus;
      priority?: TaskPriority;
      assigneeId?: string | null;
      milestoneId?: string | null;
      dueDate?: string | null;
      version: number; // Expected OCC version sent by client
    }
  ) {
    const currentTask = await prisma.task.findFirst({
      where: { id: taskId, organizationId },
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!currentTask) {
      throw new NotFoundError('Task not found in this organization');
    }

    // Step 1: Pre-check OCC version mismatch
    if (currentTask.version !== data.version) {
      logger.warn(`OCC Conflict detected on Task ${taskId}! Client sent version ${data.version}, DB has version ${currentTask.version}`);
      throw new VersionConflictError(
        `Concurrency Conflict: Task has been updated by another user (current version: ${currentTask.version}). Please review the latest changes before saving.`,
        currentTask
      );
    }

    // Step 2: Atomic update in transaction checking version match
    const updatedTask = await prisma.$transaction(async (tx) => {
      // Execute conditional update
      const updateResult = await tx.task.updateMany({
        where: {
          id: taskId,
          organizationId,
          version: data.version, // Strictly guard race conditions
        },
        data: {
          ...(data.title && { title: data.title }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.status && { status: data.status as PrismaTaskStatus }),
          ...(data.priority && { priority: data.priority as PrismaTaskPriority }),
          ...(data.assigneeId !== undefined && { assigneeId: data.assigneeId }),
          ...(data.milestoneId !== undefined && { milestoneId: data.milestoneId }),
          ...(data.dueDate !== undefined && {
            dueDate: data.dueDate ? new Date(data.dueDate) : null,
          }),
          version: { increment: 1 }, // Atomically bump version
        },
      });

      // If another transaction updated the record concurrently, 0 rows are affected
      if (updateResult.count === 0) {
        const freshTask = await tx.task.findUnique({ where: { id: taskId } });
        throw new VersionConflictError(
          `Concurrency Conflict: Task was just updated by another user.`,
          freshTask
        );
      }

      // Fetch the updated record
      const freshUpdated = await tx.task.findUniqueOrThrow({
        where: { id: taskId },
        include: {
          assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
          project: { select: { id: true, name: true, key: true } },
        },
      });

      // Track changes for activity timeline
      const changes: Record<string, { from: unknown; to: unknown }> = {};
      if (data.status && data.status !== currentTask.status) {
        changes.status = { from: currentTask.status, to: data.status };
      }
      if (data.priority && data.priority !== currentTask.priority) {
        changes.priority = { from: currentTask.priority, to: data.priority };
      }
      if (data.assigneeId !== undefined && data.assigneeId !== currentTask.assigneeId) {
        changes.assignee = { from: currentTask.assigneeId, to: data.assigneeId };
      }

      // Record Activity Event
      await tx.activityEvent.create({
        data: {
          organizationId,
          taskId,
          userId,
          action: 'TASK_UPDATED',
          details: JSON.parse(
            JSON.stringify({
              changes,
              previousVersion: currentTask.version,
              newVersion: freshUpdated.version,
            })
          ),
        },
      });

      // Record Compliance Audit Log
      await tx.auditLog.create({
        data: {
          organizationId,
          userId,
          action: AuditAction.UPDATE,
          entityType: EntityType.TASK,
          entityId: taskId,
          oldValues: { status: currentTask.status, priority: currentTask.priority, version: currentTask.version },
          newValues: { status: freshUpdated.status, priority: freshUpdated.priority, version: freshUpdated.version },
        },
      });

      return freshUpdated;
    });

    logger.info(`Task ${taskId} updated successfully to version ${updatedTask.version}`, {
      taskId,
      version: updatedTask.version,
    });

    return updatedTask;
  }

  /**
   * Delete task
   */
  async deleteTask(organizationId: string, taskId: string, userId: string) {
    const existing = await prisma.task.findFirst({
      where: { id: taskId, organizationId },
    });

    if (!existing) {
      throw new NotFoundError('Task not found in this organization');
    }

    await prisma.$transaction(async (tx) => {
      await tx.task.delete({ where: { id: taskId } });

      await tx.auditLog.create({
        data: {
          organizationId,
          userId,
          action: AuditAction.DELETE,
          entityType: EntityType.TASK,
          entityId: taskId,
          oldValues: { title: existing.title, version: existing.version },
        },
      });
    });

    return { deleted: true };
  }

  /**
   * Subtasks
   */
  async addSubtask(organizationId: string, taskId: string, title: string) {
    const task = await prisma.task.findFirst({ where: { id: taskId, organizationId } });
    if (!task) throw new NotFoundError('Task not found');

    const lastSubtask = await prisma.subtask.findFirst({
      where: { taskId },
      orderBy: { position: 'desc' },
    });

    const position = (lastSubtask?.position || 0) + 1;

    return prisma.subtask.create({
      data: {
        taskId,
        title,
        position,
      },
    });
  }

  async toggleSubtask(organizationId: string, subtaskId: string, isCompleted: boolean) {
    const subtask = await prisma.subtask.findUnique({
      where: { id: subtaskId },
      include: { task: true },
    });

    if (!subtask || subtask.task.organizationId !== organizationId) {
      throw new NotFoundError('Subtask not found in this organization');
    }

    return prisma.subtask.update({
      where: { id: subtaskId },
      data: { isCompleted },
    });
  }

  /**
   * Comments
   */
  async addComment(organizationId: string, taskId: string, authorId: string, content: string) {
    const task = await prisma.task.findFirst({ where: { id: taskId, organizationId } });
    if (!task) throw new NotFoundError('Task not found');

    const comment = await prisma.$transaction(async (tx) => {
      const created = await tx.comment.create({
        data: {
          organizationId,
          taskId,
          authorId,
          content,
        },
        include: {
          author: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
        },
      });

      await tx.activityEvent.create({
        data: {
          organizationId,
          taskId,
          userId: authorId,
          action: 'COMMENT_ADDED',
          details: { commentId: created.id },
        },
      });

      return created;
    });

    return comment;
  }

  async listComments(organizationId: string, taskId: string) {
    const task = await prisma.task.findFirst({ where: { id: taskId, organizationId } });
    if (!task) throw new NotFoundError('Task not found');

    return prisma.comment.findMany({
      where: { organizationId, taskId },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Activity Timeline
   */
  async getTaskTimeline(organizationId: string, taskId: string) {
    const task = await prisma.task.findFirst({ where: { id: taskId, organizationId } });
    if (!task) throw new NotFoundError('Task not found');

    return prisma.activityEvent.findMany({
      where: { organizationId, taskId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export const taskService = new TaskService();
export default taskService;
