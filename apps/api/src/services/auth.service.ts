import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../config/database';
import { config } from '../config';
import {
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
} from '../utils/errors';
import {
  UserRole,
  OrgMemberRole,
  AuditAction,
  EntityType,
  AuthenticatedUserPayload,
  AuthTokens,
} from '@worksphere/shared-types';
import { UserRole as PrismaUserRole, OrgMemberRole as PrismaOrgMemberRole } from '@prisma/client';
import logger from '../utils/logger';

export class AuthService {
  /**
   * Generates a cryptographic SHA-256 hash of a refresh token for safe storage.
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Creates an Access Token (short-lived) and a Refresh Token (long-lived)
   */
  private generateTokens(
    user: { id: string; email: string; role: string },
    organizationId?: string | null,
    organizationSlug?: string | null
  ): { accessToken: string; refreshTokenRaw: string; tokenHash: string } {
    const payload: AuthenticatedUserPayload = {
      userId: user.id,
      email: user.email,
      role: user.role as UserRole,
      organizationId: organizationId || null,
      organizationSlug: organizationSlug || null,
    };

    const accessToken = jwt.sign(payload, config.jwt.accessSecret, {
      expiresIn: config.jwt.accessExpiresIn as jwt.SignOptions['expiresIn'],
    });

    const refreshTokenRaw = crypto.randomBytes(40).toString('hex');
    const tokenHash = this.hashToken(refreshTokenRaw);

    return { accessToken, refreshTokenRaw, tokenHash };
  }

  /**
   * Register a new user and optionally initialize an organization.
   */
  async register(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    organizationName?: string;
    role?: UserRole;
    ipAddress?: string;
  }) {
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new BadRequestError('A user with this email address already exists.');
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(data.password, salt);

    const initialRole = (data.role || (data.organizationName ? UserRole.ORG_OWNER : UserRole.TEAM_MEMBER)) as PrismaUserRole;

    // Run atomically: Create User + Organization + Membership + AuditLog
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.email,
          passwordHash,
          firstName: data.firstName,
          lastName: data.lastName,
          role: initialRole,
        },
      });

      let organization = null;
      if (data.organizationName) {
        const slug = data.organizationName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '') + `-${Date.now().toString(36)}`;

        organization = await tx.organization.create({
          data: {
            name: data.organizationName,
            slug,
          },
        });

        await tx.organizationMember.create({
          data: {
            organizationId: organization.id,
            userId: user.id,
            role: OrgMemberRole.OWNER as PrismaOrgMemberRole,
          },
        });
      }

      // Record Audit Log
      await tx.auditLog.create({
        data: {
          organizationId: organization ? organization.id : '00000000-0000-0000-0000-000000000000',
          userId: user.id,
          action: AuditAction.CREATE,
          entityType: EntityType.USER,
          entityId: user.id,
          newValues: {
            email: user.email,
            role: user.role,
            organizationId: organization?.id,
          },
          ipAddress: data.ipAddress,
        },
      });

      return { user, organization };
    });

    const { accessToken, refreshTokenRaw, tokenHash } = this.generateTokens(
      result.user,
      result.organization?.id,
      result.organization?.slug
    );

    const familyId = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await prisma.refreshToken.create({
      data: {
        userId: result.user.id,
        tokenHash,
        familyId,
        expiresAt,
      },
    });

    return {
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        role: result.user.role as UserRole,
        organizationId: result.organization?.id || null,
        organizationName: result.organization?.name || null,
      },
      tokens: {
        accessToken,
        refreshToken: refreshTokenRaw,
        expiresIn: 900, // 15 mins in seconds
      },
    };
  }

  /**
   * Log in user, verify password, issue tokens, and handle tenant binding.
   */
  async login(data: {
    email: string;
    password: string;
    organizationId?: string;
    ipAddress?: string;
  }) {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
      include: {
        memberships: {
          include: {
            organization: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid email or password credentials', 'INVALID_CREDENTIALS');
    }

    if (!user.isActive) {
      throw new ForbiddenError('Your account has been deactivated. Please contact support.', 'ACCOUNT_DISABLED');
    }

    const isMatch = await bcrypt.compare(data.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid email or password credentials', 'INVALID_CREDENTIALS');
    }

    // Determine tenant context
    let activeOrg = null;
    if (data.organizationId) {
      const match = user.memberships.find((m) => m.organizationId === data.organizationId);
      if (!match && user.role !== UserRole.PLATFORM_ADMIN) {
        throw new ForbiddenError('You do not belong to the requested organization', 'NOT_ORG_MEMBER');
      }
      activeOrg = match?.organization || (await prisma.organization.findUnique({ where: { id: data.organizationId } }));
    } else if (user.memberships.length > 0) {
      activeOrg = user.memberships[0].organization;
    }

    const { accessToken, refreshTokenRaw, tokenHash } = this.generateTokens(
      user,
      activeOrg?.id,
      activeOrg?.slug
    );

    const familyId = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        familyId,
        expiresAt,
      },
    });

    if (activeOrg) {
      await prisma.auditLog.create({
        data: {
          organizationId: activeOrg.id,
          userId: user.id,
          action: AuditAction.LOGIN,
          entityType: EntityType.USER,
          entityId: user.id,
          ipAddress: data.ipAddress,
        },
      });
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role as unknown as UserRole,
        organizationId: activeOrg?.id || null,
        organizationName: activeOrg?.name || null,
        organizations: user.memberships.map((m) => ({
          id: m.organization.id,
          name: m.organization.name,
          slug: m.organization.slug,
          memberRole: m.role,
        })),
      },
      tokens: {
        accessToken,
        refreshToken: refreshTokenRaw,
        expiresIn: 900,
      },
    };
  }

  /**
   * Refresh Token Rotation (RTR) with Family Revocation on reuse detection
   */
  async refreshTokens(refreshTokenRaw: string, ipAddress?: string): Promise<AuthTokens> {
    const tokenHash = this.hashToken(refreshTokenRaw);

    const storedToken = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: {
            memberships: {
              include: {
                organization: true,
              },
            },
          },
        },
      },
    });

    // Case 1: Token not found or has expired
    if (!storedToken) {
      throw new UnauthorizedError('Invalid refresh token', 'REFRESH_TOKEN_INVALID');
    }

    if (new Date() > storedToken.expiresAt) {
      await prisma.refreshToken.delete({ where: { id: storedToken.id } });
      throw new UnauthorizedError('Refresh token has expired. Please log in again.', 'REFRESH_TOKEN_EXPIRED');
    }

    // Case 2: REUSE DETECTION!
    // If the token is already revoked, someone is replaying an old refresh token!
    if (storedToken.isRevoked) {
      logger.error('CRITICAL: Refresh token reuse detected! Revoking token family.', {
        userId: storedToken.userId,
        familyId: storedToken.familyId,
        ipAddress,
      });

      // Revoke the ENTIRE family immediately
      await prisma.refreshToken.updateMany({
        where: { familyId: storedToken.familyId },
        data: { isRevoked: true },
      });

      throw new UnauthorizedError(
        'Security Alert: Compromised session detected. All active sessions have been terminated.',
        'TOKEN_REUSE_DETECTED'
      );
    }

    // Case 3: Legitimate refresh - Revoke current token, issue replacement in same family
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { isRevoked: true },
    });

    const activeOrg = storedToken.user.memberships.length > 0 ? storedToken.user.memberships[0].organization : null;
    const { accessToken, refreshTokenRaw: newRefreshRaw, tokenHash: newHash } = this.generateTokens(
      storedToken.user,
      activeOrg?.id,
      activeOrg?.slug
    );

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.refreshToken.create({
      data: {
        userId: storedToken.userId,
        tokenHash: newHash,
        familyId: storedToken.familyId, // Retain same family
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken: newRefreshRaw,
      expiresIn: 900,
    };
  }

  /**
   * Log out user by revoking the refresh token
   */
  async logout(refreshTokenRaw?: string, userId?: string, ipAddress?: string): Promise<void> {
    if (refreshTokenRaw) {
      const tokenHash = this.hashToken(refreshTokenRaw);
      const token = await prisma.refreshToken.findUnique({ where: { tokenHash } });
      if (token) {
        await prisma.refreshToken.updateMany({
          where: { familyId: token.familyId },
          data: { isRevoked: true },
        });
      }
    } else if (userId) {
      await prisma.refreshToken.updateMany({
        where: { userId },
        data: { isRevoked: true },
      });
    }

    if (userId) {
      logger.info('User logged out successfully', { userId, ipAddress });
    }
  }

  /**
   * Retrieve current user profile and authorized organizations
   */
  async getCurrentUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        avatarUrl: true,
        createdAt: true,
        memberships: {
          select: {
            role: true,
            joinedAt: true,
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
                plan: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return user;
  }
}

export const authService = new AuthService();
export default authService;
