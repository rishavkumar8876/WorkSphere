import { Router } from 'express';
import { projectController } from '../../controllers/project.controller';
import { authenticate } from '../../middleware/authenticate';
import { tenantGuard } from '../../middleware/tenantGuard';
import { requireRole } from '../../middleware/requireRole';
import { validateRequest } from '../../middleware/validateRequest';
import {
  createProjectSchema,
  updateProjectSchema,
  createMilestoneSchema,
} from '../../validators/business.validator';
import { UserRole } from '@worksphere/shared-types';

const router = Router();

router.use(authenticate, tenantGuard);

router.get('/', projectController.listProjects);
router.post(
  '/',
  requireRole(UserRole.ORG_OWNER, UserRole.PROJECT_MANAGER),
  validateRequest(createProjectSchema),
  projectController.createProject
);

router.get('/:id', projectController.getProject);
router.patch(
  '/:id',
  requireRole(UserRole.ORG_OWNER, UserRole.PROJECT_MANAGER),
  validateRequest(updateProjectSchema),
  projectController.updateProject
);
router.delete(
  '/:id',
  requireRole(UserRole.ORG_OWNER, UserRole.PROJECT_MANAGER),
  projectController.deleteProject
);

// Milestones sub-routes
router.post(
  '/:projectId/milestones',
  requireRole(UserRole.ORG_OWNER, UserRole.PROJECT_MANAGER),
  validateRequest(createMilestoneSchema),
  projectController.createMilestone
);
router.get('/:projectId/milestones', projectController.listMilestones);

export default router;
