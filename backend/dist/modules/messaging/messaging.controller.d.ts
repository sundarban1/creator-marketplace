import { Request, Response, NextFunction } from 'express';
export declare class MessagingController {
    listConversations(req: Request, res: Response, next: NextFunction): Promise<void>;
    startConversation(req: Request, res: Response, next: NextFunction): Promise<void>;
    checkConversation(req: Request, res: Response, next: NextFunction): Promise<void>;
    respondToRequest(req: Request, res: Response, next: NextFunction): Promise<void>;
    getMessages(req: Request, res: Response, next: NextFunction): Promise<void>;
    sendMessage(req: Request, res: Response, next: NextFunction): Promise<void>;
    markSeen(req: Request, res: Response, next: NextFunction): Promise<void>;
    getBadgeCount(req: Request, res: Response, next: NextFunction): Promise<void>;
}
//# sourceMappingURL=messaging.controller.d.ts.map