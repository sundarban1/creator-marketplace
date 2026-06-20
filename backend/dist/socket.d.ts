import { Server } from 'socket.io';
import type { Server as HttpServer } from 'http';
export declare function initSocket(httpServer: HttpServer): Server;
export declare function emitToUser(userId: string, event: string, data: unknown): void;
export declare function emitToRole(role: string, event: string, data: unknown): void;
//# sourceMappingURL=socket.d.ts.map