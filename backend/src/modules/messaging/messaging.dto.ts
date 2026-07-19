export interface MessageDto {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: 'TEXT' | 'IMAGE' | 'FILE' | 'VIDEO';
  attachmentUrl: string | null;
  attachmentName: string | null;
  attachmentThumbnailUrl: string | null;
  attachmentDurationSec: number | null;
  attachmentWidth: number | null;
  attachmentHeight: number | null;
  attachmentSize: number | null;
  attachmentFormat: string | null;
  createdAt: string;
  isDeleted?: boolean;
  sender?: { id: string; email: string; role: string };
}

export interface ConversationDto {
  id: string;
  creatorId: string;
  creatorId2: string | null;
  businessId: string | null;
  campaignId: string | null;
  status: string;
  requestMessage: string | null;
  lastMessageAt: string | null;
  createdAt: string;
  unreadCount: number;
  creator?: { fullName: string | null; avatarUrl: string | null; userId?: string } | null;
  creator2?: { fullName: string | null; avatarUrl: string | null; userId?: string } | null;
  business?: { businessName: string | null; logoUrl: string | null; userId?: string } | null;
  campaign?: { title: string } | null;
  messages?: MessageDto[];
  // Real, server-computed discriminator for "who's on the other end" — the
  // mobile client used to guess this (always assuming BUSINESS for a creator
  // viewer), which silently broke for creator<->creator conversations.
  otherPartyRole: 'CREATOR' | 'BUSINESS';
  otherPartyProfileId: string;
  otherParty: { fullName: string | null; avatarUrl: string | null; userId?: string } | null;
}

type RawCampaign = {
  title: string;
  applications?: { creatorId: string; workStatus: string; paymentStatus: string }[];
};

type RawMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: 'TEXT' | 'IMAGE' | 'FILE' | 'VIDEO';
  attachmentUrl: string | null;
  attachmentName: string | null;
  attachmentThumbnailUrl?: string | null;
  attachmentDurationSec?: number | null;
  attachmentWidth?: number | null;
  attachmentHeight?: number | null;
  attachmentSize?: number | null;
  attachmentFormat?: string | null;
  createdAt: Date;
  deletedAt?: Date | null;
  sender?: { id: string; email: string; role: string };
};

export function toMessageDto(m: RawMessage): MessageDto {
  const isDeleted = !!m.deletedAt;
  const dto: MessageDto = {
    id:             m.id,
    conversationId: m.conversationId,
    senderId:       m.senderId,
    content:        isDeleted ? '' : m.content,
    type:           m.type,
    attachmentUrl:  isDeleted ? null : m.attachmentUrl,
    attachmentName: isDeleted ? null : m.attachmentName,
    attachmentThumbnailUrl: isDeleted ? null : (m.attachmentThumbnailUrl ?? null),
    attachmentDurationSec:  isDeleted ? null : (m.attachmentDurationSec ?? null),
    attachmentWidth:        isDeleted ? null : (m.attachmentWidth ?? null),
    attachmentHeight:       isDeleted ? null : (m.attachmentHeight ?? null),
    attachmentSize:         isDeleted ? null : (m.attachmentSize ?? null),
    attachmentFormat:       isDeleted ? null : (m.attachmentFormat ?? null),
    createdAt:      m.createdAt.toISOString(),
  };
  if (isDeleted) dto.isDeleted = true;
  if (m.sender) dto.sender = m.sender;
  return dto;
}

type RawConversation = {
  id: string;
  creatorId: string;
  creatorId2?: string | null;
  businessId: string | null;
  campaignId: string | null;
  status: string;
  requestMessage: string | null;
  lastMessageAt: Date | null;
  creatorSeenAt?: Date | null;
  creator2SeenAt?: Date | null;
  businessSeenAt?: Date | null;
  createdAt: Date;
  creator?: { fullName: string | null; avatarUrl: string | null; userId?: string } | null;
  creator2?: { fullName: string | null; avatarUrl: string | null; userId?: string } | null;
  business?: { businessName: string | null; logoUrl: string | null; userId?: string } | null;
  campaign?: RawCampaign | null;
  messages?: RawMessage[];
};

export function toConversationDto(
  c: RawConversation,
  role?: 'CREATOR' | 'BUSINESS',
  viewerCreatorId?: string,
): ConversationDto {
  const isViewerOnCreator2Side = viewerCreatorId != null && c.creatorId2 === viewerCreatorId;

  let unreadCount = 0;
  if (c.lastMessageAt) {
    const seenAt = role === 'BUSINESS' ? c.businessSeenAt
      : role === 'CREATOR' ? (isViewerOnCreator2Side ? c.creator2SeenAt : c.creatorSeenAt)
      : undefined;
    if (!seenAt || c.lastMessageAt > seenAt) unreadCount = 1;
  }

  const otherPartyRole: 'CREATOR' | 'BUSINESS' = c.creatorId2 != null
    ? 'CREATOR'
    : (role === 'CREATOR' ? 'BUSINESS' : 'CREATOR');
  const otherParty = c.creatorId2 != null
    ? (isViewerOnCreator2Side ? c.creator : c.creator2) ?? null
    : (role === 'CREATOR' ? c.business ?? null : c.creator ?? null);
  const otherPartyProfileId = c.creatorId2 != null
    ? (isViewerOnCreator2Side ? c.creatorId : c.creatorId2)
    : (role === 'CREATOR' ? c.businessId! : c.creatorId);

  const dto: ConversationDto = {
    id:             c.id,
    creatorId:      c.creatorId,
    creatorId2:     c.creatorId2 ?? null,
    businessId:     c.businessId ?? null,
    campaignId:     c.campaignId,
    status:         c.status,
    requestMessage: c.requestMessage,
    lastMessageAt:  c.lastMessageAt ? c.lastMessageAt.toISOString() : null,
    createdAt:      c.createdAt.toISOString(),
    unreadCount,
    otherPartyRole,
    otherPartyProfileId,
    otherParty,
  };
  if (c.creator  != null) dto.creator  = c.creator;
  if (c.creator2 != null) dto.creator2 = c.creator2;
  if (c.business != null) dto.business = c.business;
  // Once the creator's work on this campaign is COMPLETED, or the admin has
  // RELEASED payment for it (which happens before the creator's own COMPLETED
  // confirmation), stop surfacing the campaign/event title in the chat — the
  // conversation lives on independently.
  const campaignDone = c.campaign?.applications?.some(
    (a) => a.creatorId === c.creatorId && (a.workStatus === 'COMPLETED' || a.paymentStatus === 'RELEASED'),
  );
  if (c.campaign != null && !campaignDone) dto.campaign = { title: c.campaign.title };
  if (c.messages != null) dto.messages = c.messages.map(toMessageDto);
  return dto;
}
