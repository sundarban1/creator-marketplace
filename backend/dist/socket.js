"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSocket = initSocket;
exports.emitToUser = emitToUser;
exports.emitToRole = emitToRole;
const socket_io_1 = require("socket.io");
const jwt_1 = require("./utils/jwt");
let io = null;
function initSocket(httpServer) {
    io = new socket_io_1.Server(httpServer, {
        cors: { origin: '*', credentials: true },
        transports: ['websocket', 'polling'],
    });
    io.use((socket, next) => {
        const token = socket.handshake.auth?.token;
        if (!token)
            return next(new Error('No token'));
        try {
            const payload = (0, jwt_1.verifyAccessToken)(token);
            socket.data.userId = payload.id;
            socket.data.role = payload.role;
            next();
        }
        catch {
            next(new Error('Invalid token'));
        }
    });
    io.on('connection', (socket) => {
        const userId = socket.data.userId;
        const role = socket.data.role;
        socket.join(`user:${userId}`);
        socket.join(`role:${role}`); // 'role:CREATOR' | 'role:BUSINESS'
    });
    return io;
}
function emitToUser(userId, event, data) {
    io?.to(`user:${userId}`).emit(event, data);
}
function emitToRole(role, event, data) {
    io?.to(`role:${role}`).emit(event, data);
}
//# sourceMappingURL=socket.js.map