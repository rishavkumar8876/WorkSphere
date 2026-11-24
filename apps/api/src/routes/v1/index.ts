import { Router, Request, Response } from 'express';
import authRoutes from './auth.routes';
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

// Authentication and session routes
router.use('/auth', authRoutes);

export default router;
