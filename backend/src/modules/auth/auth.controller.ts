import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { success } from '../../utils/response';
import { logError, AppError } from '../../middleware/error';

const authService = new AuthService();

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const deviceId = req.headers['x-device-id'] as string | undefined;
      const result = await authService.register(req.body, deviceId);
      success(res, result, 'Account created successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const deviceId = req.headers['x-device-id'] as string | undefined;
      const result = await authService.login(req.body, deviceId);
      success(res, result, 'Login successful');
    } catch (err) {
      logError(req, err, 'Login failed');
      next(err);
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.refresh(req.body);
      success(res, result, 'Token refreshed');
    } catch (err) {
      next(err);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (req.user) {
        await authService.logout(req.user.id);
      }
      success(res, {}, 'Logged out successfully');
    } catch (err) {
      next(err);
    }
  }

  async verifyOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.verifyOtp(req.body);
      success(res, result, 'Email verified successfully');
    } catch (err) {
      next(err);
    }
  }

  async resendOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.resendOtp(req.body);
      success(res, result, result.message);
    } catch (err) {
      next(err);
    }
  }

  async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.forgotPassword(req.body);
      success(res, result, result.message);
    } catch (err) {
      next(err);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.resetPassword(req.body);
      success(res, result, result.message);
    } catch (err) {
      next(err);
    }
  }

  async verifyResetOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.verifyResetOtp(req.body);
      success(res, result, 'OTP verified');
    } catch (err) {
      next(err);
    }
  }

  async completeOnboarding(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.completeOnboarding(req.user!.id);
      success(res, result, result.message);
    } catch (err) {
      next(err);
    }
  }

  async deactivateAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.deactivateAccount(req.user!.id);
      success(res, result, result.message);
    } catch (err) {
      next(err);
    }
  }

  async deleteAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.deleteAccount(req.user!.id);
      success(res, result, result.message);
    } catch (err) {
      next(err);
    }
  }

  async googleAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.googleAuth(req.body);
      success(res, result, result.needsRole ? 'Role selection required' : 'Google sign-in successful');
    } catch (err) {
      next(err);
    }
  }

  async facebookAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.facebookAuth(req.body);
      success(res, result, result.needsRole ? 'Role selection required' : 'Facebook sign-in successful');
    } catch (err) {
      next(err);
    }
  }

  async requestPhoneOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.requestPhoneOtp(req.user!.id, req.body);
      success(res, result, result.message);
    } catch (err) {
      next(err);
    }
  }

  async verifyPhoneOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.verifyPhoneOtp(req.user!.id, req.body);
      success(res, result, result.message);
    } catch (err) {
      next(err);
    }
  }

  async checkEmailAvailability(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const email = req.query.email as string | undefined;
      if (!email) throw new AppError('Email query param is required', 400);
      const result = await authService.isEmailAvailable(email.trim().toLowerCase(), req.user!.id);
      success(res, result, 'Email availability checked');
    } catch (err) {
      next(err);
    }
  }

  async requestEmailOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.requestEmailOtp(req.user!.id, req.body);
      success(res, result, result.message);
    } catch (err) {
      next(err);
    }
  }

  async verifyEmailOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.verifyEmailOtp(req.user!.id, req.body);
      success(res, result, result.message);
    } catch (err) {
      next(err);
    }
  }
}
