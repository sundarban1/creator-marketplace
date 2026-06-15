import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
export declare function authenticate(req: Request, _res: Response, next: NextFunction): void;
export declare function optionalAuthenticate(req: Request, _res: Response, next: NextFunction): void;
export declare function authorize(...roles: Role[]): (req: Request, _res: Response, next: NextFunction) => void;
//# sourceMappingURL=auth.d.ts.map