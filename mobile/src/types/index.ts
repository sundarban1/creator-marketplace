export type UserRole = 'CREATOR' | 'BUSINESS' | 'CLIENT';

export type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  isFirstLogin?: boolean;
};

export type Campaign = {
  id: string;
  title: string;
  brand: string;
  platform: string;
  platformIcon: string;
  budget: string;
  budgetRaw: number;
  budgetMax?: number;
  template?: string;
  category: string;
  goals: string[];
  minFollowers: string;
  minFollowersRaw: number;
  deadline: string;
  contentType: string;
  description: string;
  deliverables: string;
  paymentType: string;
  proposals: number;
  isNew: boolean;
  isFeatured: boolean;
  status?: 'active' | 'draft' | 'closed';
  location?: string;
  createdAt: string;
  campaignType?: 'PAID_CAMPAIGN' | 'OPEN_EVENT';
  eventStatus?:  'OPEN' | 'FULL' | 'CLOSED';
  capacity?:     number;
  eventDate?:     string;
  venue?:         string;
  benefits?:      string[];
  paymentStatus?: 'UNPAID' | 'PAID' | 'RELEASED';
  paidAt?:        string | null;
};

export type Proposal = {
  id: string;
  campaignId: string;
  campaignTitle: string;
  brand: string;
  status: 'pending' | 'accepted' | 'rejected';
  submittedAt: string;
  coverLetter: string;
  proposedRate: string;
};

export type Conversation = {
  id: string;
  participantId: string;
  participantName: string;
  participantAvatar?: string;
  participantRole: 'CREATOR' | 'BUSINESS';
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  requestMessage?: string | null;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  campaignTitle?: string;
  isOnline: boolean;
};

export type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  timestamp: string;
  status: 'sending' | 'sent' | 'delivered' | 'read';
  attachmentUrl?: string;
};

export type AppNotification = {
  id: string;
  type:
    | 'proposal_received'
    | 'proposal_accepted'
    | 'proposal_rejected'
    | 'new_message'
    | 'campaign_deadline'
    | 'campaign_closed'
    | 'new_campaign'
    | 'payment_released'
    | 'message_request_accepted'
    | 'business_favorited'
    | 'creator_saved'
    | 'campaign_invitation';
  title: string;
  body: string;
  timestamp: string;
  isRead: boolean;
  refId?: string | null;
  refType?: string | null;
  actorName?: string;
  actorAvatar?: string;
};
