export interface NotificationDto {
    id: string;
    userId: string;
    type: string;
    title: string;
    body: string;
    isRead: boolean;
    refId: string | null;
    refType: string | null;
    createdAt: string;
}
type RawNotification = {
    id: string;
    userId: string;
    type: string;
    title: string;
    body: string;
    isRead: boolean;
    refId: string | null;
    refType: string | null;
    createdAt: Date;
};
export declare function toNotificationDto(n: RawNotification): NotificationDto;
export {};
//# sourceMappingURL=notification.dto.d.ts.map