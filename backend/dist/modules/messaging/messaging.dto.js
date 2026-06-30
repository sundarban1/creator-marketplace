"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toMessageDto = toMessageDto;
exports.toConversationDto = toConversationDto;
function toMessageDto(m) {
    const dto = {
        id: m.id,
        conversationId: m.conversationId,
        senderId: m.senderId,
        content: m.content,
        createdAt: m.createdAt.toISOString(),
    };
    if (m.sender)
        dto.sender = m.sender;
    return dto;
}
function toConversationDto(c) {
    const dto = {
        id: c.id,
        creatorId: c.creatorId,
        businessId: c.businessId,
        campaignId: c.campaignId,
        status: c.status,
        requestMessage: c.requestMessage,
        lastMessageAt: c.lastMessageAt ? c.lastMessageAt.toISOString() : null,
        createdAt: c.createdAt.toISOString(),
    };
    if (c.creator != null)
        dto.creator = c.creator;
    if (c.business != null)
        dto.business = c.business;
    if (c.campaign != null)
        dto.campaign = c.campaign;
    if (c.messages != null)
        dto.messages = c.messages.map(toMessageDto);
    return dto;
}
//# sourceMappingURL=messaging.dto.js.map