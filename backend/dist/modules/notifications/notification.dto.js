"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toNotificationDto = toNotificationDto;
function toNotificationDto(n) {
    return {
        id: n.id,
        userId: n.userId,
        type: n.type,
        title: n.title,
        body: n.body,
        isRead: n.isRead,
        refId: n.refId,
        refType: n.refType,
        createdAt: n.createdAt.toISOString(),
    };
}
//# sourceMappingURL=notification.dto.js.map