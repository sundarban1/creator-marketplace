export interface MessageDto {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
  sender?: { id: string; email: string; role: string };
}

export interface ConversationDto {
  id: string;
  creatorId: string;
  businessId: string;
  campaignId: string | null;
  status: string;
  requestMessage: string | null;
  lastMessageAt: string | null;
  createdAt: string;
  creator?: { fullName: string | null; avatarUrl: string | null; userId?: string } | null;
  business?: { businessName: string | null; logoUrl: string | null; userId?: string } | null;
  campaign?: { title: string } | null;
  messages?: MessageDto[];
}

type RawMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: Date;
  sender?: { id: string; email: string; role: string };
};

export function toMessageDto(m: RawMessage): MessageDto {
  const dto: MessageDto = {
    id:             m.id,
    conversationId: m.conversationId,
    senderId:       m.senderId,
    content:        m.content,
    createdAt:      m.createdAt.toISOString(),
  };
  if (m.sender) dto.sender = m.sender;
  return dto;
}

type RawConversation = {
  id: string;
  creatorId: string;
  businessId: string;
  campaignId: string | null;
  status: string;
  requestMessage: string | null;
  lastMessageAt: Date | null;
  createdAt: Date;
  creator?: { fullName: string | null; avatarUrl: string | null; userId?: string } | null;
  business?: { businessName: string | null; logoUrl: string | null; userId?: string } | null;
  campaign?: { title: string } | null;
  messages?: RawMessage[];
};

export function toConversationDto(c: RawConversation): ConversationDto {
  const dto: ConversationDto = {
    id:             c.id,
    creatorId:      c.creatorId,
    businessId:     c.businessId,
    campaignId:     c.campaignId,
    status:         c.status,
    requestMessage: c.requestMessage,
    lastMessageAt:  c.lastMessageAt ? c.lastMessageAt.toISOString() : null,
    createdAt:      c.createdAt.toISOString(),
  };
  if (c.creator  != null) dto.creator  = c.creator;
  if (c.business != null) dto.business = c.business;
  if (c.campaign != null) dto.campaign = c.campaign;
  if (c.messages != null) dto.messages = c.messages.map(toMessageDto);
  return dto;
}
