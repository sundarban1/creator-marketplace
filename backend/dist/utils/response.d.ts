import { Response } from 'express';
export declare function success<T>(res: Response, data: T, message?: string, statusCode?: number): Response;
export declare function paginated<T>(res: Response, data: T[], total: number, page: number, limit: number): Response;
export declare function error(res: Response, message: string, statusCode?: number): Response;
//# sourceMappingURL=response.d.ts.map