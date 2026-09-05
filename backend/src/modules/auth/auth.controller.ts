import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { success } from '../../utils/response';
import { logError, AppError } from '../../middleware/error';
import { getDict } from '../../i18n';

import { HttpStatus } from '../../constants/httpStatus';

const authService = new AuthService();

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const deviceId = req.headers['x-device-id'] as string | undefined;
      const result = await authService.register(req.body, deviceId);
      success(res, result, getDict().auth.accountCreated, 201);
    } catch (err) {
      next(err);
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const deviceId = req.headers['x-device-id'] as string | undefined;
      const result = await authService.login(req.body, deviceId);
      success(res, result, getDict().auth.loginSuccessful);
    } catch (err) {
      logError(req, err, 'Login failed');
      next(err);
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.refresh(req.body);
      success(res, result, getDict().auth.tokenRefreshed);
    } catch (err) {
      next(err);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (req.user) {
        const refreshToken = req.body?.refreshToken as string | undefined;
        await authService.logout(req.user.id, refreshToken);
      }
      success(res, {}, getDict().auth.loggedOut);
    } catch (err) {
      next(err);
    }
  }

  async verifyOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.verifyOtp(req.body);
      success(res, result, getDict().auth.emailVerifiedSuccess);
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
      success(res, result, getDict().auth.otpVerifiedGeneric);
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
      success(res, result, result.needsRole ? getDict().auth.roleSelectionRequired : getDict().auth.googleSignInSuccessful);
    } catch (err) {
      next(err);
    }
  }

  async facebookAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.facebookAuth(req.body);
      success(res, result, result.needsRole ? getDict().auth.roleSelectionRequired : getDict().auth.facebookSignInSuccessful);
    } catch (err) {
      next(err);
    }
  }

  async appleAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.appleAuth(req.body);
      success(res, result, result.needsRole ? getDict().auth.roleSelectionRequired : getDict().auth.appleSignInSuccessful);
    } catch (err) {
      next(err);
    }
  }

  async appleLink(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.appleLink(req.user!.id, req.body);
      success(res, result, getDict().auth.appleAccountLinkedMsg);
    } catch (err) {
      next(err);
    }
  }

  async appleNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.handleAppleNotification(req.body);
      success(res, result, getDict().auth.notificationReceived);
    } catch (err) {
      next(err);
    }
  }

  async getAuthMethods(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.getAuthMethods(req.user!.id);
      success(res, result, getDict().auth.loginMethodsLabel);
    } catch (err) {
      next(err);
    }
  }

  async unlinkProvider(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.unlinkProvider(req.user!.id, req.params as { provider: 'GOOGLE' | 'APPLE' | 'FACEBOOK' });
      success(res, result, getDict().auth.loginMethodDisconnected);
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
      if (!email) throw new AppError(getDict().auth.emailQueryRequired, HttpStatus.BAD_REQUEST);
      const result = await authService.isEmailAvailable(email.trim().toLowerCase(), req.user!.id);
      success(res, result, getDict().auth.emailAvailabilityChecked);
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
