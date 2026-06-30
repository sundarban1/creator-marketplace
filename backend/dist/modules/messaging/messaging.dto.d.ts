export interface MessageDto {
    id: string;
    conversationId: string;
    senderId: string;
    content: string;
    createdAt: string;
    sender?: {
        id: string;
        email: string;
        role: string;
    };
}
export interface ConversationDto {
    id: string;
    creatorId: string;
    businessId: string;
    campaignId: string | null;
    status: string;
    requestMessage: string | null;
    lastMessageAt: string | null;
    createdAt: string;
    creator?: {
        fullName: string | null;
        avatarUrl: string | null;
        userId?: string;
    } | null;
    business?: {
        businessName: string | null;
        logoUrl: string | null;
        userId?: string;
    } | null;
    campaign?: {
        title: string;
    } | null;
    messages?: MessageDto[];
}
type RawMessage = {
    id: string;
    conversationId: string;
    senderId: string;
    content: string;
    createdAt: Date;
    sender?: {
        id: string;
        email: string;
        role: string;
    };
};
export declare function toMessageDto(m: RawMessage): MessageDto;
type RawConversation = {
    id: string;
    creatorId: string;
    businessId: string;
    campaignId: string | null;
    status: string;
    requestMessage: string | null;
    lastMessageAt: Date | null;
    createdAt: Date;
    creator?: {
        fullName: string | null;
        avatarUrl: string | null;
        userId?: string;
    } | null;
    business?: {
        businessName: string | null;
        logoUrl: string | null;
        userId?: string;
    } | null;
    campaign?: {
        title: string;
    } | null;
    messages?: RawMessage[];
};
export declare function toConversationDto(c: RawConversation): ConversationDto;
export {};
//# sourceMappingURL=messaging.dto.d.ts.map