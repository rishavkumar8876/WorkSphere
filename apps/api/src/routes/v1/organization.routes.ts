import { Router } from 'express';
import { organizationController } from '../../controllers/organization.controller';
import { authenticate } from '../../middleware/authenticate';
import { tenantGuard } from '../../middleware/tenantGuard';
import { requireRole } from '../../middleware/requireRole';
import { validateRequest } from '../../middleware/validateRequest';
import { updateOrgSchema, inviteMemberSchema, createTeamSchema } from '../../validators/business.validator';
import { UserRole } from '@worksphere/shared-types';

const router = Router();

// All organization routes require authentication and tenant context
router.use(authenticate, tenantGuard);

router.get('/current', organizationController.getCurrent);
router.patch(
  '/current',
  requireRole(UserRole.ORG_OWNER),
  validateRequest(updateOrgSchema),
  organizationController.updateCurrent
);

router.get('/members', organizationController.getMembers);
router.post(
  '/invitations',
  requireRole(UserRole.ORG_OWNER, UserRole.PROJECT_MANAGER),
  validateRequest(inviteMemberSchema),
  organizationController.inviteMember
);

router.get('/teams', organizationController.getTeams);
router.post(
  '/teams',
  requireRole(UserRole.ORG_OWNER, UserRole.PROJECT_MANAGER),
  validateRequest(createTeamSchema),
  organizationController.createTeam
);

export default router;
