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
    listConversations(userId: string, role: Role, status?: ConversationStatus): Promise<({
        campaign: {
            title: string;
        } | null;
        business: {
            businessName: string;
            logoUrl: string | null;
        };
        messages: {
            id: string;
            createdAt: Date;
            content: string;
            conversationId: string;
            senderId: string;
        }[];
    } & {
        status: import(".prisma/client").$Enums.ConversationStatus;
        id: string;
        createdAt: Date;
        creatorId: string;
        businessId: string;
        campaignId: string | null;
        requestMessage: string | null;
        lastMessageAt: Date | null;
        businessSeenAt: Date | null;
        creatorSeenAt: Date | null;
    })[] | ({
        campaign: {
            title: string;
        } | null;
        creator: {
            fullName: string;
            avatarUrl: string | null;
        };
        messages: {
            id: string;
            createdAt: Date;
            content: string;
            conversationId: string;
            senderId: string;
        }[];
    } & {
        status: import(".prisma/client").$Enums.ConversationStatus;
        id: string;
        createdAt: Date;
        creatorId: string;
        businessId: string;
        campaignId: string | null;
        requestMessage: string | null;
        lastMessageAt: Date | null;
        businessSeenAt: Date | null;
        creatorSeenAt: Date | null;
    })[]>;
    startConversation(userId: string, role: Role, input: StartConversationInput): Promise<{
        campaign: {
            title: string;
        } | null;
        business: {
            businessName: string;
            logoUrl: string | null;
        };
        creator: {
            fullName: string;
            avatarUrl: string | null;
        };
    } & {
        status: import(".prisma/client").$Enums.ConversationStatus;
        id: string;
        createdAt: Date;
        creatorId: string;
        businessId: string;
        campaignId: string | null;
        requestMessage: string | null;
        lastMessageAt: Date | null;
        businessSeenAt: Date | null;
        creatorSeenAt: Date | null;
    }>;
    checkConversation(userId: string, creatorProfileId: string): Promise<{
        status: import(".prisma/client").$Enums.ConversationStatus;
        id: string;
    } | null>;
    respondToRequest(conversationId: string, userId: string, action: 'accept' | 'decline'): Promise<{
        status: "ACCEPTED" | "DECLINED";
    }>;
    getMessages(conversationId: string, userId: string, role: Role, page: number, limit: number): Promise<{
        messages: ({
            sender: {
                email: string;
                id: string;
                role: import(".prisma/client").$Enums.Role;
            };
        } & {
            id: string;
            createdAt: Date;
            content: string;
            conversationId: string;
            senderId: string;
        })[];
        total: number;
        page: number;
        limit: number;
    }>;
    sendMessage(conversationId: string, userId: string, role: Role, input: SendMessageInput): Promise<{
        sender: {
            email: string;
            id: string;
            role: import(".prisma/client").$Enums.Role;
        };
    } & {
        id: string;
        createdAt: Date;
        content: string;
        conversationId: string;
        senderId: string;
    }>;
    markSeen(conversationId: string, userId: string, role: Role): Promise<void>;
    getBadgeCount(userId: string, role: Role): Promise<{
        count: number;
        pendingRequests: number;
        unread: number;
    }>;
}
//# sourceMappingURL=messaging.service.d.ts.map