import request from 'supertest';
import { createApp } from '../src/app';
import { UserRole } from '@worksphere/shared-types';
import jwt from 'jsonwebtoken';
import { config } from '../src/config';

// Mock prisma client for unit/API test suite
jest.mock('../src/config/database', () => {
  const mockUser = {
    id: 'user-uuid-1',
    email: 'test@example.com',
    passwordHash: '$2a$12$eXampleHashedPasswordForTestOnly99999999999999999999999',
    firstName: 'Test',
    lastName: 'User',
    role: 'ORG_OWNER',
    isActive: true,
    memberships: [
      {
        organizationId: 'org-uuid-1',
        role: 'OWNER',
        organization: {
          id: 'org-uuid-1',
          name: 'Acme Test Org',
          slug: 'acme-test-org',
        },
      },
    ],
  };

  const mockOrg = {
    id: 'org-uuid-1',
    name: 'Acme Test Org',
    slug: 'acme-test-org',
    plan: 'free',
  };

  return {
    __esModule: true,
    default: {
      user: {
        findUnique: jest.fn().mockImplementation(({ where }) => {
          if (where.email === 'test@example.com' || where.id === 'user-uuid-1') return Promise.resolve(mockUser);
          return Promise.resolve(null);
        }),
        create: jest.fn().mockResolvedValue(mockUser),
      },
      organization: {
        findUnique: jest.fn().mockResolvedValue(mockOrg),
        create: jest.fn().mockResolvedValue(mockOrg),
      },
      organizationMember: {
        create: jest.fn().mockResolvedValue({ id: 'mem-1' }),
      },
      refreshToken: {
        create: jest.fn().mockResolvedValue({ id: 'rt-1' }),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
      },
      $transaction: jest.fn().mockImplementation(async (callback) => {
        return callback({
          user: { create: jest.fn().mockResolvedValue(mockUser) },
          organization: { create: jest.fn().mockResolvedValue(mockOrg) },
          organizationMember: { create: jest.fn().mockResolvedValue({ id: 'mem-1' }) },
          auditLog: { create: jest.fn().mockResolvedValue({ id: 'audit-1' }) },
        });
      }),
      $disconnect: jest.fn().mockResolvedValue(undefined),
    },
    prisma: {
      $disconnect: jest.fn().mockResolvedValue(undefined),
    },
  };
});

// Mock bcryptjs so tests are blazingly fast
jest.mock('bcryptjs', () => ({
  genSalt: jest.fn().mockResolvedValue('mock-salt'),
  hash: jest.fn().mockResolvedValue('$2a$12$mockedHash'),
  compare: jest.fn().mockImplementation((rawPassword, hash) => {
    return Promise.resolve(rawPassword === 'Password123!');
  }),
}));

describe('WorkSphere Core API & Authentication Test Suite', () => {
  const app = createApp();

  describe('GET /health & /ready', () => {
    it('should return 200 OK for base health check', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });

    it('should return 200 OK for /api/v1/health', async () => {
      const res = await request(app).get('/api/v1/health');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.service).toBe('WorkSphere Core API');
    });
  });

  describe('POST /api/v1/auth/register', () => {
    it('should reject invalid email formats', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        email: 'invalid-email-format',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject weak passwords without numbers or uppercase', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        email: 'john@example.com',
        password: 'weak',
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should successfully register a new user and return tokens', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        email: 'newuser@example.com',
        password: 'Password123!',
        firstName: 'New',
        lastName: 'User',
        organizationName: 'Acme Test Org',
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.tokens).toBeDefined();
      expect(res.body.data.tokens.accessToken).toBeDefined();
      expect(res.body.data.tokens.refreshToken).toBeDefined();
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should reject invalid password', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'test@example.com',
        password: 'WrongPassword!',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should successfully authenticate and return JWT with user claims', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'test@example.com',
        password: 'Password123!',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('test@example.com');
      expect(res.body.data.tokens.accessToken).toBeDefined();
      expect(res.body.data.tokens.refreshToken).toBeDefined();
    });
  });

  describe('GET /api/v1/auth/me (Protected Route)', () => {
    it('should reject unauthenticated request with 401', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should accept valid JWT and return user profile', async () => {
      const validToken = jwt.sign(
        {
          userId: 'user-uuid-1',
          email: 'test@example.com',
          role: UserRole.ORG_OWNER,
          organizationId: 'org-uuid-1',
        },
        config.jwt.accessSecret,
        { expiresIn: '15m' }
      );

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('test@example.com');
    });
  });

  describe('404 Route Not Found', () => {
    it('should return standardized 404 for nonexistent routes', async () => {
      const res = await request(app).get('/api/v1/nonexistent');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });
});
