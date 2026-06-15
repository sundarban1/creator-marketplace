import { Role } from '@prisma/client';
import type { StartConversationInput, SendMessageInput } from './messaging.schema';
export declare class MessagingService {
    private repo;
    private creatorRepo;
    private businessRepo;
    constructor();
    listConversations(userId: string, role: Role): Promise<({
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
    })[] | ({
        business: {
            businessName: string;
        };
        creator: {
            fullName: string;
        };
    } & {
        id: string;
        createdAt: Date;
        businessId: string;
        campaignId: string | null;
        creatorId: string;
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
        id: string;
        createdAt: Date;
        businessId: string;
        campaignId: string | null;
        creatorId: string;
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
            conversationId: string;
            senderId: string;
            content: string;
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
        conversationId: string;
        senderId: string;
        content: string;
    }>;
    private verifyConversationAccess;
}
//# sourceMappingURL=messaging.service.d.ts.map