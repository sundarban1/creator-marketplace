import { Request, Response, NextFunction } from 'express';
export declare class NotificationController {
    list(req: Request, res: Response, next: NextFunction): Promise<void>;
    badge(req: Request, res: Response, next: NextFunction): Promise<void>;
    markRead(req: Request, res: Response, next: NextFunction): Promise<void>;
    markAllRead(req: Request, res: Response, next: NextFunction): Promise<void>;
    markReadByRef(req: Request, res: Response, next: NextFunction): Promise<void>;
}
//# sourceMappingURL=notification.controller.d.ts.map