import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { sendSuccess } from '../utils/response';

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.register({
        ...req.body,
        ipAddress: req.ip,
      });
      sendSuccess(res, result, 201, 'User account and organization registered successfully');
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.login({
        ...req.body,
        ipAddress: req.ip,
      });
      sendSuccess(res, result, 200, 'Authentication successful');
    } catch (error) {
      next(error);
    }
  }

  async refreshTokens(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;
      const tokens = await authService.refreshTokens(refreshToken, req.ip);
      sendSuccess(res, tokens, 200, 'Access token refreshed successfully');
    } catch (error) {
      next(error);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;
      await authService.logout(refreshToken, req.user?.userId, req.ip);
      sendSuccess(res, { loggedOut: true }, 200, 'Logged out successfully');
    } catch (error) {
      next(error);
    }
  }

  async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await authService.getCurrentUser(req.user!.userId);
      sendSuccess(res, { user }, 200, 'Current profile retrieved');
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
export default authController;
