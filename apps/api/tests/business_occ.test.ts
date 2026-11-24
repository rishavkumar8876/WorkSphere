import request from 'supertest';
import { createApp } from '../src/app';
import { UserRole, TaskStatus, TaskPriority, ProjectStatus } from '@worksphere/shared-types';
import jwt from 'jsonwebtoken';
import { config } from '../src/config';

// In-memory simulated database state for realistic OCC and tenant isolation testing
const state = {
  orgA: { id: 'org-aaa-111', name: 'Tenant A', slug: 'tenant-a' },
  orgB: { id: 'org-bbb-222', name: 'Tenant B', slug: 'tenant-b' },
  projects: [
    {
      id: 'proj-1',
      organizationId: 'org-aaa-111',
      name: 'Project A1',
      key: 'PA1',
      status: ProjectStatus.ACTIVE,
      ownerId: 'user-pm-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  tasks: [
    {
      id: '10000000-0000-0000-0000-000000000100',
      organizationId: 'org-aaa-111',
      projectId: 'proj-1',
      title: 'Capstone Task for OCC Verification',
      description: 'Testing simultaneous user updates',
      status: TaskStatus.TODO,
      priority: TaskPriority.HIGH,
      assigneeId: 'user-dev-1',
      reporterId: 'user-pm-1',
      version: 1, // OCC INITIAL VERSION
      createdAt: new Date(),
      updatedAt: new Date(),
      assignee: { id: 'user-dev-1', firstName: 'Dev', lastName: 'One', email: 'dev@a.com' },
      reporter: { id: 'user-pm-1', firstName: 'PM', lastName: 'One', email: 'pm@a.com' },
      project: { id: 'proj-1', name: 'Project A1', key: 'PA1' },
      milestone: null,
      subtasks: [],
      comments: [],
      attachments: [],
      _count: { subtasks: 0, comments: 0, attachments: 0 },
    },
  ],
  auditLogs: [] as any[],
  activityEvents: [] as any[],
};

// Mock prisma client
jest.mock('../src/config/database', () => {
  return {
    __esModule: true,
    default: {
      project: {
        findMany: jest.fn().mockImplementation(({ where }) => {
          return Promise.resolve(state.projects.filter((p) => p.organizationId === where.organizationId));
        }),
        count: jest.fn().mockImplementation(({ where }) => {
          return Promise.resolve(state.projects.filter((p) => p.organizationId === where.organizationId).length);
        }),
        findFirst: jest.fn().mockImplementation(({ where }) => {
          return Promise.resolve(state.projects.find((p) => p.id === where.id && p.organizationId === where.organizationId) || null);
        }),
        findUnique: jest.fn().mockImplementation(({ where }) => {
          if (where.organizationId_key) {
            return Promise.resolve(
              state.projects.find(
                (p) => p.organizationId === where.organizationId_key.organizationId && p.key === where.organizationId_key.key
              ) || null
            );
          }
          return Promise.resolve(state.projects.find((p) => p.id === where.id) || null);
        }),
        create: jest.fn().mockImplementation(({ data }) => {
          const created = { id: `proj-${Date.now()}`, ...data, createdAt: new Date(), updatedAt: new Date() };
          state.projects.push(created);
          return Promise.resolve(created);
        }),
      },
      projectMember: {
        create: jest.fn().mockResolvedValue({ id: 'pm-1' }),
      },
      task: {
        findMany: jest.fn().mockImplementation(({ where }) => {
          return Promise.resolve(state.tasks.filter((t) => t.organizationId === where.organizationId));
        }),
        count: jest.fn().mockImplementation(({ where }) => {
          return Promise.resolve(state.tasks.filter((t) => t.organizationId === where.organizationId).length);
        }),
        findFirst: jest.fn().mockImplementation(({ where }) => {
          return Promise.resolve(state.tasks.find((t) => t.id === where.id && t.organizationId === where.organizationId) || null);
        }),
        findUnique: jest.fn().mockImplementation(({ where }) => {
          return Promise.resolve(state.tasks.find((t) => t.id === where.id) || null);
        }),
        findUniqueOrThrow: jest.fn().mockImplementation(({ where }) => {
          const t = state.tasks.find((t) => t.id === where.id);
          if (!t) throw new Error('Not found');
          return Promise.resolve(t);
        }),
        create: jest.fn().mockImplementation(({ data }) => {
          const created = { id: `task-${Date.now()}`, ...data, version: 1, createdAt: new Date(), updatedAt: new Date() };
          state.tasks.push(created);
          return Promise.resolve(created);
        }),
        updateMany: jest.fn().mockImplementation(({ where, data }) => {
          const task = state.tasks.find(
            (t) => t.id === where.id && t.organizationId === where.organizationId && t.version === where.version
          );
          if (!task) {
            return Promise.resolve({ count: 0 }); // 0 rows affected -> CONCURRENCY COLLISION!
          }
          // Increment version atomically
          task.version += 1;
          if (data.status) task.status = data.status;
          if (data.title) task.title = data.title;
          return Promise.resolve({ count: 1 });
        }),
      },
      auditLog: {
        create: jest.fn().mockImplementation(({ data }) => {
          state.auditLogs.push(data);
          return Promise.resolve({ id: `audit-${Date.now()}`, ...data });
        }),
        findMany: jest.fn().mockImplementation(({ where }) => {
          return Promise.resolve(state.auditLogs.filter((a) => a.organizationId === where.organizationId));
        }),
        count: jest.fn().mockImplementation(({ where }) => {
          return Promise.resolve(state.auditLogs.filter((a) => a.organizationId === where.organizationId).length);
        }),
      },
      activityEvent: {
        create: jest.fn().mockImplementation(({ data }) => {
          state.activityEvents.push(data);
          return Promise.resolve({ id: `act-${Date.now()}`, ...data });
        }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      $transaction: jest.fn().mockImplementation(async (callback) => {
        // Pass mock prisma inside transaction
        const client = require('../src/config/database').default;
        return callback(client);
      }),
      $disconnect: jest.fn().mockResolvedValue(undefined),
    },
  };
});

describe('WorkSphere Core Business Modules & Optimistic Concurrency Control (OCC)', () => {
  const app = createApp();

  // Helper to generate test JWTs
  const createToken = (userId: string, role: UserRole, organizationId: string) => {
    return jwt.sign(
      { userId, email: `${userId}@test.com`, role, organizationId },
      config.jwt.accessSecret,
      { expiresIn: '15m' }
    );
  };

  const pmTokenOrgA = createToken('user-pm-1', UserRole.PROJECT_MANAGER, state.orgA.id);
  const devTokenOrgA = createToken('user-dev-1', UserRole.TEAM_MEMBER, state.orgA.id);
  const auditorTokenOrgA = createToken('user-auditor-1', UserRole.AUDITOR, state.orgA.id);
  const userTokenOrgB = createToken('user-org-b', UserRole.PROJECT_MANAGER, state.orgB.id);

  describe('1. Tenant Isolation Enforcement', () => {
    it('should reject User from Tenant B attempting to access Tenant A tasks', async () => {
      const res = await request(app)
        .get('/api/v1/tasks/10000000-0000-0000-0000-000000000100')
        .set('Authorization', `Bearer ${userTokenOrgB}`)
        .set('x-organization-id', state.orgA.id); // Attempt cross-tenant breach

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('CROSS_TENANT_FORBIDDEN');
    });

    it('should return 404 if Tenant B searches for Tenant A task using their own tenant context', async () => {
      const res = await request(app)
        .get('/api/v1/tasks/10000000-0000-0000-0000-000000000100')
        .set('Authorization', `Bearer ${userTokenOrgB}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('2. Role-Based Access Control (RBAC) on Projects', () => {
    it('should reject Team Member trying to create a project (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${devTokenOrgA}`)
        .send({
          name: 'Unauthorized Project',
          key: 'UNAUTH',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should allow Project Manager to create a project', async () => {
      const res = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${pmTokenOrgA}`)
        .send({
          name: 'Sprint 24 Platform',
          key: 'SPRINT24',
          description: 'Q4 engineering deliverables',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.key).toBe('SPRINT24');
    });
  });

  describe('3. Capstone Challenge: Optimistic Concurrency Control (OCC) on Tasks', () => {
    it('should successfully update task when version matches expected version (1 -> 2)', async () => {
      // User 1 (Alice) opens task which is at version: 1
      const res = await request(app)
        .patch('/api/v1/tasks/10000000-0000-0000-0000-000000000100')
        .set('Authorization', `Bearer ${pmTokenOrgA}`)
        .send({
          status: TaskStatus.IN_PROGRESS,
          version: 1, // Matches current version
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.version).toBe(2); // Bumped to 2
      expect(res.body.data.status).toBe(TaskStatus.IN_PROGRESS);
    });

    it('should REJECT simultaneous update from User 2 with 409 Conflict due to stale version', async () => {
      // User 2 (Bob) had also opened task at version: 1 and tries to update it now
      const res = await request(app)
        .patch('/api/v1/tasks/10000000-0000-0000-0000-000000000100')
        .set('Authorization', `Bearer ${devTokenOrgA}`)
        .send({
          status: TaskStatus.DONE,
          version: 1, // STALE VERSION! Database is already at version: 2
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VERSION_CONFLICT');
      // Verify that current task data is returned with conflict for client-side diff
      expect(res.body.error.details).toBeDefined();
      expect(res.body.error.details.version).toBe(2);
    });

    it('should allow User 2 to successfully resubmit after fetching and reviewing version 2', async () => {
      // User 2 reviews changes and submits with updated version: 2
      const res = await request(app)
        .patch('/api/v1/tasks/10000000-0000-0000-0000-000000000100')
        .set('Authorization', `Bearer ${devTokenOrgA}`)
        .send({
          status: TaskStatus.DONE,
          version: 2, // Matches fresh version
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.version).toBe(3); // Bumped to 3
      expect(res.body.data.status).toBe(TaskStatus.DONE);
    });
  });

  describe('4. Audit Log Access & Compliance', () => {
    it('should allow Auditor to query audit logs', async () => {
      const res = await request(app)
        .get('/api/v1/audit-logs')
        .set('Authorization', `Bearer ${auditorTokenOrgA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should reject Team Member trying to query compliance audit logs', async () => {
      const res = await request(app)
        .get('/api/v1/audit-logs')
        .set('Authorization', `Bearer ${devTokenOrgA}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });
  });
});
