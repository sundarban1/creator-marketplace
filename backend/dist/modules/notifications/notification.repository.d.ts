export declare class NotificationRepository {
    create(data: {
        userId: string;
        type: string;
        title: string;
        body: string;
        refId?: string;
        refType?: string;
    }): Promise<{
        type: string;
        id: string;
        createdAt: Date;
        userId: string;
        body: string;
        title: string;
        isRead: boolean;
        refId: string | null;
        refType: string | null;
    }>;
    createMany(data: Array<{
        userId: string;
        type: string;
        title: string;
        body: string;
        refId?: string;
        refType?: string;
    }>): Promise<import(".prisma/client").Prisma.BatchPayload>;
    findByUser(userId: string): Promise<{
        type: string;
        id: string;
        createdAt: Date;
        userId: string;
        body: string;
        title: string;
        isRead: boolean;
        refId: string | null;
        refType: string | null;
    }[]>;
    markRead(id: string, userId: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
    markAllRead(userId: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
    getUnreadCount(userId: string): Promise<number>;
}
//# sourceMappingURL=notification.repository.d.ts.map