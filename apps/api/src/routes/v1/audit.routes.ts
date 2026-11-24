import { Router } from 'express';
import { auditController } from '../../controllers/audit.controller';
import { authenticate } from '../../middleware/authenticate';
import { tenantGuard } from '../../middleware/tenantGuard';
import { requireRole } from '../../middleware/requireRole';
import { UserRole } from '@worksphere/shared-types';

const router = Router();

router.use(authenticate, tenantGuard);

router.get(
  '/',
  requireRole(UserRole.AUDITOR, UserRole.ORG_OWNER),
  auditController.listLogs
);

export default router;
