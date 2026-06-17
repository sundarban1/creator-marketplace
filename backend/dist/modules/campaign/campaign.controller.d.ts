import { Request, Response, NextFunction } from 'express';
export declare class CampaignController {
    create(req: Request, res: Response, next: NextFunction): Promise<void>;
    getCategories(req: Request, res: Response, next: NextFunction): Promise<void>;
    list(req: Request, res: Response, next: NextFunction): Promise<void>;
    getById(req: Request, res: Response, next: NextFunction): Promise<void>;
    update(req: Request, res: Response, next: NextFunction): Promise<void>;
    delete(req: Request, res: Response, next: NextFunction): Promise<void>;
    getMyCampaigns(req: Request, res: Response, next: NextFunction): Promise<void>;
    apply(req: Request, res: Response, next: NextFunction): Promise<void>;
    getCampaignApplications(req: Request, res: Response, next: NextFunction): Promise<void>;
    acceptApplication(req: Request, res: Response, next: NextFunction): Promise<void>;
    rejectApplication(req: Request, res: Response, next: NextFunction): Promise<void>;
    getBusinessApplications(req: Request, res: Response, next: NextFunction): Promise<void>;
    getMyApplications(req: Request, res: Response, next: NextFunction): Promise<void>;
}
//# sourceMappingURL=campaign.controller.d.ts.map