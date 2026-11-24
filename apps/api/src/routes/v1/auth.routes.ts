import { Router } from 'express';
import { authController } from '../../controllers/auth.controller';
import { validateRequest } from '../../middleware/validateRequest';
import { authenticate } from '../../middleware/authenticate';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
} from '../../validators/auth.validator';

const router = Router();

router.post('/register', validateRequest(registerSchema), authController.register);
router.post('/login', validateRequest(loginSchema), authController.login);
router.post('/refresh', validateRequest(refreshTokenSchema), authController.refreshTokens);
router.post('/logout', authController.logout);
router.get('/me', authenticate, authController.getMe);

export default router;
