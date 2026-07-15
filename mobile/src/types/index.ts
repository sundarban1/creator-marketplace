export type UserRole = 'CREATOR' | 'BUSINESS' | 'CLIENT';

export type User = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: UserRole;
  avatar?: string;
  isFirstLogin?: boolean;
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
};

export type Campaign = {
  id: string;
  title: string;
  brand: string;
  platforms: string[];
  platformIcons: string[];
  budget: string;
  budgetRaw: number;
  budgetMax?: number;
  template?: string;
  featureImageUrl?: string;
  category: string;
  categoryKey: string;
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
  creatorsNeeded?: number;
  objective?:            string;
  contentGuidelines?:    string[];
  targetAudience?:       string[];
  hashtags?:             string[];
  sampleCaption?:        string;
  callToAction?:         string;
  approvalRequirements?: string;
  aiGenerated?:           boolean;
  aiSuggestedCategories?: string[];
  aiSuggestedPlatforms?:  string[];
  distanceKm?:            number;
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
  participantUserId?: string;
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
  type: 'TEXT' | 'IMAGE' | 'FILE';
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  isDeleted?: boolean;
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
    | 'work_approved'
    | 'payment_released'
    | 'message_request_accepted'
    | 'business_favorited'
    | 'creator_saved'
    | 'campaign_invitation'
    | 'account_verified'
    | 'verification_rejected';
  title: string;
  body: string;
  timestamp: string;
  isRead: boolean;
  refId?: string | null;
  refType?: string | null;
  actorName?: string;
  actorAvatar?: string;
};
