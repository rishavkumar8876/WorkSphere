import { Router, Request, Response } from 'express';
import authRoutes from './auth.routes';
import organizationRoutes from './organization.routes';
import projectRoutes from './project.routes';
import taskRoutes from './task.routes';
import auditRoutes from './audit.routes';
import { sendSuccess } from '../../utils/response';

const router = Router();

// Base v1 health and meta endpoint
router.get('/health', (req: Request, res: Response) => {
  sendSuccess(res, {
    status: 'healthy',
    service: 'WorkSphere Core API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Modular business routes
router.use('/auth', authRoutes);
router.use('/organizations', organizationRoutes);
router.use('/projects', projectRoutes);
router.use('/tasks', taskRoutes);
router.use('/audit-logs', auditRoutes);

export default router;
