"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
exports.optionalAuthenticate = optionalAuthenticate;
exports.authorize = authorize;
const jwt_1 = require("../utils/jwt");
const error_1 = require("./error");
function authenticate(req, _res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        next(new error_1.AppError('No token provided. Please authenticate.', 401));
        return;
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = (0, jwt_1.verifyAccessToken)(token);
        req.user = {
            id: decoded.id,
            email: decoded.email,
            role: decoded.role,
        };
        next();
    }
    catch (err) {
        next(err);
    }
}
function optionalAuthenticate(req, _res, next) {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
        try {
            const decoded = (0, jwt_1.verifyAccessToken)(authHeader.split(' ')[1]);
            req.user = { id: decoded.id, email: decoded.email, role: decoded.role };
        }
        catch {
            // invalid / expired token — proceed without setting req.user
        }
    }
    next();
}
function authorize(...roles) {
    return (req, _res, next) => {
        if (!req.user) {
            next(new error_1.AppError('Not authenticated', 401));
            return;
        }
        if (!roles.includes(req.user.role)) {
            next(new error_1.AppError(`Access denied. Required role: ${roles.join(' or ')}. Your role: ${req.user.role}`, 403));
            return;
        }
        next();
    };
}
//# sourceMappingURL=auth.js.map