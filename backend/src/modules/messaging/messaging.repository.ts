import { ConversationStatus } from '@prisma/client';
import prisma from '../../prisma';

// Only the applications relevant to this conversation's creator are needed to
// tell whether the campaign work is COMPLETED or payment has been RELEASED for
// them — see toConversationDto, which hides the campaign title once either is true.
const CAMPAIGN_SELECT = { select: { title: true, applications: { select: { creatorId: true, workStatus: true, paymentStatus: true } } } };

const CONV_SELECT_CREATOR = {
  id: true, creatorId: true, businessId: true, campaignId: true, status: true,
  requestMessage: true, lastMessageAt: true, creatorSeenAt: true, createdAt: true,
  business: { select: { businessName: true, logoUrl: true } },
  campaign: CAMPAIGN_SELECT,
  messages: { orderBy: { createdAt: 'desc' as const }, take: 1 },
};

const CONV_SELECT_BUSINESS = {
  id: true, creatorId: true, businessId: true, campaignId: true, status: true,
  requestMessage: true, lastMessageAt: true, businessSeenAt: true, createdAt: true,
  creator:  { select: { fullName: true, avatarUrl: true } },
  campaign: CAMPAIGN_SELECT,
  messages: { orderBy: { createdAt: 'desc' as const }, take: 1 },
};

const CONV_INCLUDE_FULL = {
  creator:  { select: { fullName: true, avatarUrl: true, userId: true } },
  business: { select: { businessName: true, logoUrl: true, userId: true } },
  campaign: CAMPAIGN_SELECT,
};

export class MessagingRepository {
  async findOrCreateConversation(
    creatorId: string,
    businessId: string,
    campaignId?: string,
    requestMessage?: string,
    initialStatus: ConversationStatus = 'PENDING',
    initiatorUserId?: string,
  ) {
    const existing = await prisma.conversation.findUnique({
      where: { creatorId_businessId: { creatorId, businessId } },
      include: CONV_INCLUDE_FULL,
    });

    if (existing) {
      // Re-open a declined conversation as a new request
      if (existing.status === 'DECLINED') {
        return prisma.conversation.update({
          where: { id: existing.id },
          data: { status: initialStatus, requestMessage: requestMessage ?? null },
          include: CONV_INCLUDE_FULL,
        });
      }
      return existing;
    }

    const conv = await prisma.conversation.create({
      data: { creatorId, businessId, campaignId, status: initialStatus, requestMessage },
      include: CONV_INCLUDE_FULL,
    });

    // Store requestMessage as first Message so it appears in chat history
    if (requestMessage) {
      // Default to the business user (today's business-initiated flow) unless the caller specifies otherwise
      let senderId = initiatorUserId;
      if (!senderId) {
        const business = await prisma.businessProfile.findUnique({
          where: { id: businessId },
          select: { userId: true },
        });
        senderId = business?.userId;
      }
      if (senderId) {
        await prisma.message.create({
          data: { conversationId: conv.id, senderId, content: requestMessage },
        });
        await prisma.conversation.update({
          where: { id: conv.id },
          data: { lastMessageAt: new Date() },
        });
      }
    }

    return conv;
  }

  // Used when a business accepts a creator's proposal — establishes (or reactivates)
  // the conversation as ACCEPTED directly, with no PENDING request step needed.
  // `activated` is false when the conversation was already ACCEPTED (a real chat
  // request/accept had already happened) — the caller should leave it alone in
  // that case rather than sending a greeting into an already-live conversation.
  async findOrCreateAcceptedConversation(
    creatorId: string,
    businessId: string,
    campaignId?: string,
  ): Promise<{ conversation: NonNullable<Awaited<ReturnType<MessagingRepository['findConversationById']>>>; activated: boolean }> {
    const existing = await prisma.conversation.findUnique({
      where: { creatorId_businessId: { creatorId, businessId } },
      include: CONV_INCLUDE_FULL,
    });

    if (existing) {
      if (existing.status === 'ACCEPTED') return { conversation: existing, activated: false };
      const conversation = await prisma.conversation.update({
        where: { id: existing.id },
        data: { status: 'ACCEPTED', autoAccepted: true, campaignId: existing.campaignId ?? campaignId },
        include: CONV_INCLUDE_FULL,
      });
      return { conversation, activated: true };
    }

    const conversation = await prisma.conversation.create({
      data: { creatorId, businessId, campaignId, status: 'ACCEPTED', autoAccepted: true },
      include: CONV_INCLUDE_FULL,
    });
    return { conversation, activated: true };
  }

  // Once a project is completed and paid out, a conversation that was only ever
  // auto-accepted (never a real chat request/accept) reverts to PENDING — messaging
  // is paused until either side sends a fresh request. A genuinely-accepted
  // conversation (autoAccepted: false) is left untouched.
  async resetToPendingAfterCompletion(creatorId: string, businessId: string): Promise<string | null> {
    const existing = await prisma.conversation.findUnique({
      where: { creatorId_businessId: { creatorId, businessId } },
      select: { id: true, status: true, autoAccepted: true },
    });
    if (!existing || existing.status !== 'ACCEPTED' || !existing.autoAccepted) return null;

    await prisma.conversation.update({
      where: { id: existing.id },
      data: { status: 'PENDING', autoAccepted: false, requestMessage: null },
    });
    return existing.id;
  }

  async findConversationsByCreator(creatorId: string, status?: ConversationStatus, page = 1, limit = 50) {
    const where = { creatorId, hiddenForCreator: false, ...(status ? { status } : {}) };
    const [conversations, total] = await Promise.all([
      prisma.conversation.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        // `id` tie-breaker — two conversations can plausibly share both
        // lastMessageAt and createdAt (e.g. neither has an exchanged message
        // yet), so without it, pagination across pages isn't deterministic.
        orderBy: [{ lastMessageAt: 'desc' }, { createdAt: 'desc' }, { id: 'asc' }],
        select: CONV_SELECT_CREATOR,
      }),
      prisma.conversation.count({ where }),
    ]);
    return { conversations, total };
  }

  async findConversationsByBusiness(businessId: string, status?: ConversationStatus, page = 1, limit = 50) {
    const where = { businessId, hiddenForBusiness: false, ...(status ? { status } : {}) };
    const [conversations, total] = await Promise.all([
      prisma.conversation.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ lastMessageAt: 'desc' }, { createdAt: 'desc' }, { id: 'asc' }],
        select: CONV_SELECT_BUSINESS,
      }),
      prisma.conversation.count({ where }),
    ]);
    return { conversations, total };
  }

  /** "Delete conversation" — per-side hide, resets automatically on the next message. */
  async hideConversationForUser(conversationId: string, field: 'hiddenForCreator' | 'hiddenForBusiness') {
    return prisma.conversation.update({ where: { id: conversationId }, data: { [field]: true } });
  }

  async findConversationById(id: string) {
    return prisma.conversation.findUnique({
      where: { id },
      include: CONV_INCLUDE_FULL,
    });
  }

  async findConversationBetween(creatorId: string, businessId: string) {
    return prisma.conversation.findUnique({
      where: { creatorId_businessId: { creatorId, businessId } },
      select: { id: true, status: true },
    });
  }

  async updateStatus(id: string, status: ConversationStatus) {
    return prisma.conversation.update({ where: { id }, data: { status } });
  }

  async updateSeenAt(id: string, field: 'businessSeenAt' | 'creatorSeenAt') {
    return prisma.conversation.update({ where: { id }, data: { [field]: new Date() } });
  }

  async findMessages(conversationId: string, page: number, limit: number, viewerRole: 'CREATOR' | 'BUSINESS' | 'ADMIN') {
    const skip = (page - 1) * limit;
    // "Delete for me" hides a message from just the deleting side's view —
    // filter it out of their own history entirely (admins see everything).
    const hiddenField = viewerRole === 'CREATOR' ? 'hiddenForCreator' : viewerRole === 'BUSINESS' ? 'hiddenForBusiness' : null;
    const where = { conversationId, ...(hiddenField ? { [hiddenField]: false } : {}) };
    const [messages, total] = await Promise.all([
      // Fetch newest-first so page 1 always contains the most recent messages.
      // The controller reverses the array before sending so the client receives
      // messages in chronological order (oldest → newest).
      prisma.message.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { sender: { select: { id: true, email: true, role: true } } },
      }),
      prisma.message.count({ where }),
    ]);
    return { messages: messages.reverse(), total };
  }

  async findMessageById(messageId: string) {
    return prisma.message.findUnique({ where: { id: messageId } });
  }

  /** "Delete for me" — hides a single message from one side's view only. */
  async hideMessageForUser(messageId: string, field: 'hiddenForCreator' | 'hiddenForBusiness') {
    return prisma.message.update({ where: { id: messageId }, data: { [field]: true } });
  }

  /** "Delete for everyone" (sender-only) — tombstones the message for both sides. */
  async softDeleteMessage(messageId: string, deletedBy: string) {
    return prisma.message.update({
      where: { id: messageId },
      data: { deletedAt: new Date(), deletedBy },
      include: { sender: { select: { id: true, email: true, role: true } } },
    });
  }

  /** The single most recent message in this conversation, if any — used to
   *  detect whether a new message is a "reply" to the other party (for
   *  response-time analytics) before the new message itself is inserted. */
  async findLastMessage(conversationId: string) {
    return prisma.message.findFirst({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      select: { senderId: true, createdAt: true },
    });
  }

  async createMessage(data: {
    conversationId: string;
    senderId: string;
    content: string;
    type?: 'TEXT' | 'IMAGE' | 'FILE';
    attachmentUrl?: string;
    attachmentName?: string;
  }) {
    const msg = await prisma.message.create({
      data,
      include: { sender: { select: { id: true, email: true, role: true } } },
    });
    // Update lastMessageAt, and un-hide the conversation for whichever side
    // had "deleted" it — a fresh message brings the thread back to their inbox.
    await prisma.conversation.update({
      where: { id: data.conversationId },
      data: { lastMessageAt: msg.createdAt, hiddenForCreator: false, hiddenForBusiness: false },
    });
    return msg;
  }

  async getBadgeCount(profileId: string, role: 'CREATOR' | 'BUSINESS') {
    if (role === 'CREATOR') {
      // Count of PENDING requests + unread messages in ACCEPTED convos
      const [pendingRequests, acceptedConvos] = await Promise.all([
        prisma.conversation.count({ where: { creatorId: profileId, status: 'PENDING' } }),
        prisma.conversation.findMany({
          where: { creatorId: profileId, status: 'ACCEPTED' },
          select: { id: true, creatorSeenAt: true, lastMessageAt: true },
        }),
      ]);
      // Unread in accepted convos = convos where lastMessageAt > creatorSeenAt
      const unread = acceptedConvos.filter(
        (c) => c.lastMessageAt && (!c.creatorSeenAt || c.lastMessageAt > c.creatorSeenAt)
      ).length;
      return { count: pendingRequests + unread, pendingRequests, unread };
    } else {
      // Business: unread in ACCEPTED convos
      const acceptedConvos = await prisma.conversation.findMany({
        where: { businessId: profileId, status: 'ACCEPTED' },
        select: { id: true, businessSeenAt: true, lastMessageAt: true },
      });
      const unread = acceptedConvos.filter(
        (c) => c.lastMessageAt && (!c.businessSeenAt || c.lastMessageAt > c.businessSeenAt)
      ).length;
      return { count: unread, pendingRequests: 0, unread };
    }
  }
}
