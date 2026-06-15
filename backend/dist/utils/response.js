"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.success = success;
exports.paginated = paginated;
exports.error = error;
function success(res, data, message = 'Success', statusCode = 200) {
    return res.status(statusCode).json({
        success: true,
        message,
        data,
    });
}
function paginated(res, data, total, page, limit) {
    return res.status(200).json({
        success: true,
        message: 'Success',
        data,
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        },
    });
}
function error(res, message, statusCode = 400) {
    return res.status(statusCode).json({
        success: false,
        message,
    });
}
//# sourceMappingURL=response.js.map