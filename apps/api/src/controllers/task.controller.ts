import { Request, Response, NextFunction } from 'express';
import { taskService } from '../services/task.service';
import { sendSuccess } from '../utils/response';
import { TaskStatus, TaskPriority } from '@worksphere/shared-types';

export class TaskController {
  async listTasks(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { projectId, milestoneId, assigneeId, status, priority, search, page, limit, sortBy, sortOrder } =
        req.query;

      const result = await taskService.listTasks(req.organizationId!, {
        projectId: projectId as string,
        milestoneId: milestoneId as string,
        assigneeId: assigneeId as string,
        status: status as TaskStatus,
        priority: priority as TaskPriority,
        search: search as string,
        page: page ? parseInt(page as string, 10) : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        sortBy: sortBy as 'createdAt' | 'updatedAt' | 'dueDate' | 'priority' | 'status',
        sortOrder: sortOrder as 'asc' | 'desc',
      });

      sendSuccess(res, result.tasks, 200, undefined, result.meta);
    } catch (error) {
      next(error);
    }
  }

  async createTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const task = await taskService.createTask(
        req.organizationId!,
        req.user!.userId,
        req.body
      );
      sendSuccess(res, task, 201, 'Task created successfully');
    } catch (error) {
      next(error);
    }
  }

  async getTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const task = await taskService.getTask(req.organizationId!, req.params.id);
      sendSuccess(res, task, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Optimistic Concurrency Control update endpoint.
   * If version mismatch or concurrent race condition occurs,
   * returns 409 Conflict with the current server record.
   */
  async updateTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const updated = await taskService.updateTask(
        req.organizationId!,
        req.params.id,
        req.user!.userId,
        req.body
      );
      sendSuccess(res, updated, 200, 'Task updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async deleteTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await taskService.deleteTask(
        req.organizationId!,
        req.params.id,
        req.user!.userId
      );
      sendSuccess(res, result, 200, 'Task deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  async addSubtask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const subtask = await taskService.addSubtask(
        req.organizationId!,
        req.params.taskId,
        req.body.title
      );
      sendSuccess(res, subtask, 201, 'Subtask added successfully');
    } catch (error) {
      next(error);
    }
  }

  async toggleSubtask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { isCompleted } = req.body;
      const subtask = await taskService.toggleSubtask(
        req.organizationId!,
        req.params.id,
        Boolean(isCompleted)
      );
      sendSuccess(res, subtask, 200, 'Subtask updated');
    } catch (error) {
      next(error);
    }
  }

  async addComment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const comment = await taskService.addComment(
        req.organizationId!,
        req.params.taskId,
        req.user!.userId,
        req.body.content
      );
      sendSuccess(res, comment, 201, 'Comment added successfully');
    } catch (error) {
      next(error);
    }
  }

  async listComments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const comments = await taskService.listComments(
        req.organizationId!,
        req.params.taskId
      );
      sendSuccess(res, comments, 200);
    } catch (error) {
      next(error);
    }
  }

  async getTimeline(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const timeline = await taskService.getTaskTimeline(
        req.organizationId!,
        req.params.taskId
      );
      sendSuccess(res, timeline, 200);
    } catch (error) {
      next(error);
    }
  }
}

export const taskController = new TaskController();
export default taskController;
