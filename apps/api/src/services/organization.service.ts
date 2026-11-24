import prisma from '../config/database';
import { NotFoundError, BadRequestError, ForbiddenError } from '../utils/errors';
import { OrgMemberRole, AuditAction, EntityType } from '@worksphere/shared-types';
import { OrgMemberRole as PrismaOrgMemberRole } from '@prisma/client';
import crypto from 'crypto';

export class OrganizationService {
  async getOrganization(organizationId: string) {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        _count: {
          select: {
            members: true,
            projects: true,
            teams: true,
          },
        },
      },
    });

    if (!org) {
      throw new NotFoundError('Organization not found');
    }

    return org;
  }

  async updateOrganization(organizationId: string, data: { name?: string; plan?: string }, userId: string) {
    const existing = await prisma.organization.findUnique({ where: { id: organizationId } });
    if (!existing) {
      throw new NotFoundError('Organization not found');
    }

    const updated = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.update({
        where: { id: organizationId },
        data: {
          ...(data.name && { name: data.name }),
          ...(data.plan && { plan: data.plan }),
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          userId,
          action: AuditAction.UPDATE,
          entityType: EntityType.ORGANIZATION,
          entityId: organizationId,
          oldValues: { name: existing.name, plan: existing.plan },
          newValues: { name: org.name, plan: org.plan },
        },
      });

      return org;
    });

    return updated;
  }

  async listMembers(organizationId: string) {
    return prisma.organizationMember.findMany({
      where: { organizationId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            avatarUrl: true,
            createdAt: true,
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });
  }

  async inviteMember(organizationId: string, invitedById: string, email: string, role: OrgMemberRole) {
    // Check if user already in org
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      const existingMember = await prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId,
            userId: existingUser.id,
          },
        },
      });
      if (existingMember) {
        throw new BadRequestError('User is already a member of this organization.');
      }
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    const invitation = await prisma.invitation.create({
      data: {
        organizationId,
        email,
        role: role as PrismaOrgMemberRole,
        token,
        invitedById,
        expiresAt,
      },
    });

    await prisma.auditLog.create({
      data: {
        organizationId,
        userId: invitedById,
        action: AuditAction.CREATE,
        entityType: EntityType.USER,
        entityId: invitation.id,
        newValues: { email, role, expiresAt },
      },
    });

    return {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      invitationUrl: `/invite/accept?token=${token}`,
    };
  }

  async listTeams(organizationId: string) {
    return prisma.team.findMany({
      where: { organizationId },
      include: {
        _count: {
          select: { members: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async createTeam(organizationId: string, name: string, description?: string) {
    const existing = await prisma.team.findUnique({
      where: {
        organizationId_name: {
          organizationId,
          name,
        },
      },
    });

    if (existing) {
      throw new BadRequestError(`A team named '${name}' already exists in this organization.`);
    }

    return prisma.team.create({
      data: {
        organizationId,
        name,
        description,
      },
    });
  }
}

export const organizationService = new OrganizationService();
export default organizationService;
