"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSocket = initSocket;
exports.emitToUser = emitToUser;
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
            next();
        }
        catch {
            next(new Error('Invalid token'));
        }
    });
    io.on('connection', (socket) => {
        const userId = socket.data.userId;
        socket.join(`user:${userId}`);
    });
    return io;
}
function emitToUser(userId, event, data) {
    io?.to(`user:${userId}`).emit(event, data);
}
//# sourceMappingURL=socket.js.map