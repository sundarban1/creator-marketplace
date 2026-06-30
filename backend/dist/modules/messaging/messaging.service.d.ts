import { ConversationStatus, Role } from '@prisma/client';
import type { StartConversationInput, SendMessageInput } from './messaging.schema';
export declare class MessagingService {
    private repo;
    private creatorRepo;
    private businessRepo;
    constructor();
    private resolveCreator;
    private resolveBusiness;
    private verifyConversationAccess;
    listConversations(userId: string, role: Role, status?: ConversationStatus): Promise<import("./messaging.dto").ConversationDto[]>;
    startConversation(userId: string, role: Role, input: StartConversationInput): Promise<import("./messaging.dto").ConversationDto>;
    checkConversation(userId: string, creatorProfileId: string): Promise<{
        status: import(".prisma/client").$Enums.ConversationStatus;
        id: string;
    } | null>;
    respondToRequest(conversationId: string, userId: string, action: 'accept' | 'decline'): Promise<{
        status: "ACCEPTED" | "DECLINED";
    }>;
    getMessages(conversationId: string, userId: string, role: Role, page: number, limit: number): Promise<{
        messages: import("./messaging.dto").MessageDto[];
        total: number;
        page: number;
        limit: number;
    }>;
    sendMessage(conversationId: string, userId: string, role: Role, input: SendMessageInput): Promise<import("./messaging.dto").MessageDto>;
    markSeen(conversationId: string, userId: string, role: Role): Promise<void>;
    getBadgeCount(userId: string, role: Role): Promise<{
        count: number;
        pendingRequests: number;
        unread: number;
    }>;
}
//# sourceMappingURL=messaging.service.d.ts.map