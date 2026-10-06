export interface NotificationDto {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  refId: string | null;
  refType: string | null;
  applicationId: string | null;
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
  applicationId?: string | null;
  createdAt: Date;
};

export function toNotificationDto(n: RawNotification): NotificationDto {
  return {
    id:        n.id,
    userId:    n.userId,
    type:      n.type,
    title:     n.title,
    body:      n.body,
    isRead:    n.isRead,
    refId:     n.refId,
    refType:   n.refType,
    applicationId: n.applicationId ?? null,
    createdAt: n.createdAt.toISOString(),
  };
}
