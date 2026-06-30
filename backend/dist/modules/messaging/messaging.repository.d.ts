import { ConversationStatus } from '@prisma/client';
export declare class MessagingRepository {
    findOrCreateConversation(creatorId: string, businessId: string, campaignId?: string, requestMessage?: string): Promise<{
        campaign: {
            title: string;
        } | null;
        business: {
            userId: string;
            businessName: string | null;
            logoUrl: string | null;
        };
        creator: {
            userId: string;
            fullName: string | null;
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
    findConversationsByCreator(creatorId: string, status?: ConversationStatus): Promise<({
        campaign: {
            title: string;
        } | null;
        business: {
            businessName: string | null;
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
    })[]>;
    findConversationsByBusiness(businessId: string, status?: ConversationStatus): Promise<({
        campaign: {
            title: string;
        } | null;
        creator: {
            fullName: string | null;
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
    findConversationById(id: string): Promise<({
        campaign: {
            title: string;
        } | null;
        business: {
            userId: string;
            businessName: string | null;
            logoUrl: string | null;
        };
        creator: {
            userId: string;
            fullName: string | null;
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
    }) | null>;
    findConversationBetween(creatorId: string, businessId: string): Promise<{
        status: import(".prisma/client").$Enums.ConversationStatus;
        id: string;
    } | null>;
    updateStatus(id: string, status: ConversationStatus): Promise<{
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
    updateSeenAt(id: string, field: 'businessSeenAt' | 'creatorSeenAt'): Promise<{
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
    findMessages(conversationId: string, page: number, limit: number): Promise<{
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
    }>;
    createMessage(data: {
        conversationId: string;
        senderId: string;
        content: string;
    }): Promise<{
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
    getBadgeCount(profileId: string, role: 'CREATOR' | 'BUSINESS'): Promise<{
        count: number;
        pendingRequests: number;
        unread: number;
    }>;
}
//# sourceMappingURL=messaging.repository.d.ts.map