import { Request, Response, NextFunction } from 'express';
export declare class AuthController {
    register(req: Request, res: Response, next: NextFunction): Promise<void>;
    login(req: Request, res: Response, next: NextFunction): Promise<void>;
    refresh(req: Request, res: Response, next: NextFunction): Promise<void>;
    logout(req: Request, res: Response, next: NextFunction): Promise<void>;
    verifyOtp(req: Request, res: Response, next: NextFunction): Promise<void>;
    resendOtp(req: Request, res: Response, next: NextFunction): Promise<void>;
    forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void>;
    resetPassword(req: Request, res: Response, next: NextFunction): Promise<void>;
    forgotPasswordByPhone(req: Request, res: Response, next: NextFunction): Promise<void>;
    verifyResetOtp(req: Request, res: Response, next: NextFunction): Promise<void>;
    completeOnboarding(req: Request, res: Response, next: NextFunction): Promise<void>;
    deactivateAccount(req: Request, res: Response, next: NextFunction): Promise<void>;
    deleteAccount(req: Request, res: Response, next: NextFunction): Promise<void>;
    requestPhoneOtp(req: Request, res: Response, next: NextFunction): Promise<void>;
    verifyPhoneOtp(req: Request, res: Response, next: NextFunction): Promise<void>;
}
//# sourceMappingURL=auth.controller.d.ts.map