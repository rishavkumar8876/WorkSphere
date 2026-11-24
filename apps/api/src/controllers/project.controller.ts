import { Request, Response, NextFunction } from 'express';
import { projectService } from '../services/project.service';
import { sendSuccess } from '../utils/response';
import { ProjectStatus } from '@worksphere/shared-types';

export class ProjectController {
  async listProjects(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status, search, page, limit } = req.query;
      const result = await projectService.listProjects(req.organizationId!, {
        status: status as ProjectStatus,
        search: search as string,
        page: page ? parseInt(page as string, 10) : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
      });
      sendSuccess(res, result.projects, 200, undefined, result.meta);
    } catch (error) {
      next(error);
    }
  }

  async createProject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const project = await projectService.createProject(
        req.organizationId!,
        req.user!.userId,
        req.body
      );
      sendSuccess(res, project, 201, 'Project created successfully');
    } catch (error) {
      next(error);
    }
  }

  async getProject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const project = await projectService.getProject(req.organizationId!, req.params.id);
      sendSuccess(res, project, 200);
    } catch (error) {
      next(error);
    }
  }

  async updateProject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const project = await projectService.updateProject(
        req.organizationId!,
        req.params.id,
        req.user!.userId,
        req.body
      );
      sendSuccess(res, project, 200, 'Project updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async deleteProject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const project = await projectService.deleteProject(
        req.organizationId!,
        req.params.id,
        req.user!.userId
      );
      sendSuccess(res, project, 200, 'Project archived successfully');
    } catch (error) {
      next(error);
    }
  }

  async createMilestone(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const milestone = await projectService.createMilestone(
        req.organizationId!,
        req.params.projectId,
        req.body
      );
      sendSuccess(res, milestone, 201, 'Milestone created successfully');
    } catch (error) {
      next(error);
    }
  }

  async listMilestones(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const milestones = await projectService.listMilestones(
        req.organizationId!,
        req.params.projectId
      );
      sendSuccess(res, milestones, 200);
    } catch (error) {
      next(error);
    }
  }
}

export const projectController = new ProjectController();
export default projectController;
