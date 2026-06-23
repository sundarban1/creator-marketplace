import { Request, Response, NextFunction } from 'express';
export declare class CreatorController {
    listCreators(req: Request, res: Response, next: NextFunction): Promise<void>;
    getCreatorPublicProfile(req: Request, res: Response, next: NextFunction): Promise<void>;
    getCreatorFilterOptions(req: Request, res: Response, next: NextFunction): Promise<void>;
    getProfile(req: Request, res: Response, next: NextFunction): Promise<void>;
    updateProfile(req: Request, res: Response, next: NextFunction): Promise<void>;
    addPortfolioLink(req: Request, res: Response, next: NextFunction): Promise<void>;
    removePortfolioLink(req: Request, res: Response, next: NextFunction): Promise<void>;
    updateSocialLinks(req: Request, res: Response, next: NextFunction): Promise<void>;
    getSocialAccounts(req: Request, res: Response, next: NextFunction): Promise<void>;
    addSocialAccount(req: Request, res: Response, next: NextFunction): Promise<void>;
    updateSocialAccount(req: Request, res: Response, next: NextFunction): Promise<void>;
    deleteSocialAccount(req: Request, res: Response, next: NextFunction): Promise<void>;
    getEarnings(req: Request, res: Response, next: NextFunction): Promise<void>;
    updatePaymentMethods(req: Request, res: Response, next: NextFunction): Promise<void>;
    updateCampaignPrefs(req: Request, res: Response, next: NextFunction): Promise<void>;
    uploadAvatar(req: Request, res: Response, next: NextFunction): Promise<void>;
}
//# sourceMappingURL=creator.controller.d.ts.map