export declare class MessagingRepository {
    findOrCreateConversation(creatorId: string, businessId: string, campaignId?: string): Promise<{
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
        id: string;
        createdAt: Date;
        businessId: string;
        campaignId: string | null;
        creatorId: string;
    }>;
    findConversationsByCreator(creatorId: string): Promise<({
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
            conversationId: string;
            senderId: string;
            content: string;
        }[];
    } & {
        id: string;
        createdAt: Date;
        businessId: string;
        campaignId: string | null;
        creatorId: string;
    })[]>;
    findConversationsByBusiness(businessId: string): Promise<({
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
            conversationId: string;
            senderId: string;
            content: string;
        }[];
    } & {
        id: string;
        createdAt: Date;
        businessId: string;
        campaignId: string | null;
        creatorId: string;
    })[]>;
    findConversationById(id: string): Promise<({
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
        id: string;
        createdAt: Date;
        businessId: string;
        campaignId: string | null;
        creatorId: string;
    }) | null>;
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
            conversationId: string;
            senderId: string;
            content: string;
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
        conversationId: string;
        senderId: string;
        content: string;
    }>;
}
//# sourceMappingURL=messaging.repository.d.ts.map