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
  // True while the account still holds an Apple placeholder email; the app
  // routes the user through /add-email before anything else.
  emailIsPlaceholder?: boolean;
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
  // Applications received inside the trending window (last 72h). Undefined
  // when the endpoint that produced this campaign doesn't measure it — the
  // trending scorer falls back to an average-rate estimate in that case.
  recentProposals?: number;
  isNew: boolean;
  isFeatured: boolean;
  status?: 'active' | 'draft' | 'closed' | 'pending_approval' | 'expired';
  location?: string;
  locationLat?: number | null;
  locationLng?: number | null;
  locationType?: 'ONSITE' | 'REMOTE';
  createdAt: string;
  campaignType?: 'PAID_CAMPAIGN' | 'OPEN_EVENT';
  eventStatus?:  'OPEN' | 'FULL' | 'CLOSED';
  capacity?:     number;
  eventDate?:     string;
  // Open-event start time as "HH:mm" (24h). Null/absent when none was set.
  eventTime?:     string | null;
  venue?:         string;
  benefits?:      string[];
  paymentStatus?: 'UNPAID' | 'PAID' | 'RELEASED';
  paidAt?:        string | null;
  creatorsNeeded?: number;
  targetAudience?:       string[];
  hashtags?:             string[];
  sampleCaption?:        string;
  aiGenerated?:           boolean;
  aiSuggestedCategories?: string[];
  distanceKm?:            number;
  // Present only for multi-role campaigns — see ApiCampaignRequirement.
  requirements?: import('@/lib/api').ApiCampaignRequirement[];
  completionType?:   'SERVICE' | 'DELIVERABLE' | null;
  completionReason?: string | null;
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
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CLOSED';
  requestMessage?: string | null;
  lastMessage: string;
  lastMessageType?: 'TEXT' | 'IMAGE' | 'FILE' | 'VIDEO' | 'VOICE';
  lastMessageAttachmentName?: string | null;
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
  // 'finalizing' sits between 'uploading' (chunk transport) and 'sent': all
  // chunks landed at Cloudinary, but the backend's complete-call (which
  // verifies + creates the real message row) is still in flight.
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'compressing' | 'uploading' | 'finalizing' | 'failed';
  type: 'TEXT' | 'IMAGE' | 'FILE' | 'VIDEO' | 'VOICE' | 'SYSTEM';
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  attachmentThumbnailUrl?: string | null;
  attachmentDurationSec?: number | null;
  attachmentWidth?: number | null;
  attachmentHeight?: number | null;
  attachmentSize?: number | null;
  attachmentFormat?: string | null;
  // Server-verified — VIDEO only, null for every other type. See backend's
  // VideoAssetStatus for why PROCESSING/READY both currently resolve within
  // the same request (no async job exists yet).
  attachmentStatus?: 'PROCESSING' | 'READY' | 'FAILED' | null;
  // VOICE only — CSV of normalized (0-1) bar heights for the waveform.
  attachmentWaveform?: string | null;
  isDeleted?: boolean;
  editedAt?: string;
  // Local-only — never round-trips through the server. Kept on the message object
  // so Retry can re-run the upload without reopening the picker.
  localUri?: string;
  uploadProgress?: number; // 0..1, meaningful only while status === 'uploading'
  retryCount?: number;
  // Diagnostic only — real reason the last upload attempt failed (HTTP status,
  // network error, etc). Surfaced in the failed-attachment bubble since the
  // generic "Upload failed" label alone gives no way to tell a server rejection
  // apart from a dropped connection.
  errorDetail?: string;
};

// Free-event Q&A ("Ask Organizer"). `askerName` is populated only for the
// business viewer — creators get null and the screen shows "A creator asked".
export type EventQuestion = {
  id: string;
  question: string;
  answer: string | null;
  answeredAt: string | null;
  createdAt: string;
  isMine: boolean;
  askerName: string | null;
};

export type AppNotification = {
  id: string;
  type:
    | 'proposal_received'
    | 'work_started'
    | 'work_submitted'
    | 'revision_requested'
    | 'proposal_accepted'
    | 'proposal_rejected'
    | 'new_message'
    | 'campaign_deadline'
    | 'campaign_closed'
    | 'new_campaign'
    | 'work_approved'
    | 'payment_released'
    | 'project_completed'
    | 'review_received'
    | 'message_request_accepted'
    | 'business_favorited'
    | 'creator_saved'
    | 'campaign_invitation'
    | 'account_verified'
    | 'verification_rejected'
    | 'proposal_expired'
    | 'event_expired'
    | 'team_invitation'
    | 'team_invitation_response'
    | 'withdrawal_processing'
    | 'withdrawal_paid'
    | 'withdrawal_rejected'
    | 'event_question_asked'
    | 'event_question_answered';
  title: string;
  body: string;
  timestamp: string;
  isRead: boolean;
  refId?: string | null;
  refType?: string | null;
  actorName?: string;
  actorAvatar?: string;
};
