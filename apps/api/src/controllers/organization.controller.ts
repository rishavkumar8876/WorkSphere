import { Request, Response, NextFunction } from 'express';
import { organizationService } from '../services/organization.service';
import { sendSuccess } from '../utils/response';

export class OrganizationController {
  async getCurrent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const org = await organizationService.getOrganization(req.organizationId!);
      sendSuccess(res, org, 200);
    } catch (error) {
      next(error);
    }
  }

  async updateCurrent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const updated = await organizationService.updateOrganization(
        req.organizationId!,
        req.body,
        req.user!.userId
      );
      sendSuccess(res, updated, 200, 'Organization settings updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async getMembers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const members = await organizationService.listMembers(req.organizationId!);
      sendSuccess(res, members, 200);
    } catch (error) {
      next(error);
    }
  }

  async inviteMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const invitation = await organizationService.inviteMember(
        req.organizationId!,
        req.user!.userId,
        req.body.email,
        req.body.role
      );
      sendSuccess(res, invitation, 201, 'Invitation created successfully');
    } catch (error) {
      next(error);
    }
  }

  async getTeams(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const teams = await organizationService.listTeams(req.organizationId!);
      sendSuccess(res, teams, 200);
    } catch (error) {
      next(error);
    }
  }

  async createTeam(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const team = await organizationService.createTeam(
        req.organizationId!,
        req.body.name,
        req.body.description
      );
      sendSuccess(res, team, 201, 'Team created successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const organizationController = new OrganizationController();
export default organizationController;
