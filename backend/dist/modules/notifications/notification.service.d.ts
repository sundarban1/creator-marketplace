export declare const notificationService: {
    getForUser(userId: string, lang?: string): Promise<import("./notification.dto").NotificationDto[]>;
    markRead(id: string, userId: string): Promise<void>;
    markAllRead(userId: string): Promise<void>;
    markReadByRef(userId: string, refId: string): Promise<void>;
    getBadge(userId: string): Promise<{
        count: number;
    }>;
    create(data: {
        userId: string;
        type: string;
        title: string;
        body: string;
        refId?: string;
        refType?: string;
    }): Promise<import("./notification.dto").NotificationDto>;
    createMany(data: Array<{
        userId: string;
        type: string;
        title: string;
        body: string;
        refId?: string;
        refType?: string;
    }>): Promise<import(".prisma/client").Prisma.BatchPayload | undefined>;
};
//# sourceMappingURL=notification.service.d.ts.map