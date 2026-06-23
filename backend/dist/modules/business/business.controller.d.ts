import { Request, Response, NextFunction } from 'express';
export declare class BusinessController {
    getProfile(req: Request, res: Response, next: NextFunction): Promise<void>;
    updateProfile(req: Request, res: Response, next: NextFunction): Promise<void>;
    listBusinesses(req: Request, res: Response, next: NextFunction): Promise<void>;
    getBusinessPublic(req: Request, res: Response, next: NextFunction): Promise<void>;
    uploadLogo(req: Request, res: Response, next: NextFunction): Promise<void>;
}
//# sourceMappingURL=business.controller.d.ts.map