-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ServiceRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('PENDING', 'COMPLETED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "RequirementBudgetType" AS ENUM ('FIXED', 'RANGE', 'NEGOTIABLE');

-- CreateEnum
CREATE TYPE "PaymentTransactionType" AS ENUM ('ESCROW_IN', 'PAYOUT');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('PENDING_BUSINESS', 'EXECUTED', 'VOID');

-- CreateEnum
CREATE TYPE "ReportTargetType" AS ENUM ('USER', 'BUSINESS', 'SERVICE', 'OPPORTUNITY', 'POST', 'MESSAGE', 'REVIEW');

-- CreateEnum
CREATE TYPE "ReportReason" AS ENUM ('SPAM', 'SCAM', 'FRAUD', 'HARASSMENT', 'INAPPROPRIATE_CONTENT', 'FAKE_PROFILE', 'PAYMENT_ISSUE', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('NEW', 'UNDER_REVIEW', 'ACTION_TAKEN', 'DISMISSED');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CREATOR', 'BUSINESS', 'ADMIN');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'ACTIVE', 'PAUSED', 'CLOSED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('TEXT', 'IMAGE', 'FILE', 'VIDEO', 'VOICE', 'SYSTEM');

-- CreateEnum
CREATE TYPE "VideoAssetStatus" AS ENUM ('PROCESSING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "AiMessageRole" AS ENUM ('USER', 'ASSISTANT', 'TOOL');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'SHORTLISTED', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "CampaignType" AS ENUM ('PAID_CAMPAIGN', 'OPEN_EVENT');

-- CreateEnum
CREATE TYPE "LocationType" AS ENUM ('ONSITE', 'REMOTE');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('OPEN', 'FULL', 'CLOSED');

-- CreateEnum
CREATE TYPE "WorkStatus" AS ENUM ('NONE', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'COMPLETED', 'REVISION', 'CANCELLED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PAID', 'RELEASED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PricingModel" AS ENUM ('PER_PROJECT', 'PER_HOUR', 'PER_DAY', 'PER_CAMPAIGN', 'CUSTOM_QUOTE');

-- CreateEnum
CREATE TYPE "ServiceStatus" AS ENUM ('ACTIVE', 'HIDDEN', 'REPORTED', 'REMOVED');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('IMAGE', 'VIDEO');

-- CreateEnum
CREATE TYPE "AvailabilityStatus" AS ENUM ('AVAILABLE', 'BUSY', 'UNAVAILABLE');

-- CreateEnum
CREATE TYPE "LocationVisibility" AS ENUM ('EXACT', 'CITY', 'DISTRICT');

-- CreateEnum
CREATE TYPE "ProviderType" AS ENUM ('INDIVIDUAL', 'TEAM', 'AGENCY');

-- CreateEnum
CREATE TYPE "RepresentingType" AS ENUM ('ORGANIZATION', 'INDIVIDUAL');

-- CreateEnum
CREATE TYPE "BusinessPurpose" AS ENUM ('BRAND_MARKETING', 'CONTENT_CREATION', 'EVENT', 'WEDDING', 'PHOTOSHOOT', 'PERFORMANCE', 'COLLABORATION', 'OTHER');

-- CreateEnum
CREATE TYPE "BusinessSize" AS ENUM ('SOLO', 'SMALL', 'MEDIUM', 'LARGE', 'AGENCY', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- CreateEnum
CREATE TYPE "CategoryScope" AS ENUM ('CREATOR', 'BUSINESS', 'BOTH');

-- CreateEnum
CREATE TYPE "CategoryStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "CitizenshipStatus" AS ENUM ('NONE', 'PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('NONE', 'PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PlatformStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "SuccessStoryStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "VisitorChatStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "VisitorMessageSender" AS ENUM ('VISITOR', 'ADMIN');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
    "isPhoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "phone" TEXT,
    "isOnboarded" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "suspendedAt" TIMESTAMP(3),
    "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
    "lastFailedLoginAt" TIMESTAMP(3),
    "deviceId" TEXT,
    "lastSeenAt" TIMESTAMP(3),
    "pushNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "emailNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "deviceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "deviceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blocks" (
    "id" TEXT NOT NULL,
    "blockerId" TEXT NOT NULL,
    "blockedId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creator_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fullName" TEXT,
    "bio" TEXT,
    "location" TEXT,
    "avatarUrl" TEXT,
    "coverImageUrl" TEXT,
    "categories" TEXT[],
    "socialLinks" JSONB NOT NULL DEFAULT '{}',
    "portfolioLinks" JSONB NOT NULL DEFAULT '[]',
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "username" TEXT,
    "paymentMethods" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "prefPlatforms" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "prefLocations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "prefBudgetMin" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "prefBudgetMax" DOUBLE PRECISION NOT NULL DEFAULT 500,
    "locationLat" DOUBLE PRECISION,
    "locationLng" DOUBLE PRECISION,
    "nearbyRadiusKm" INTEGER NOT NULL DEFAULT 25,
    "nearbyUseHomeLocation" BOOLEAN NOT NULL DEFAULT false,
    "referralCode" TEXT,
    "citizenshipDocUrl" TEXT,
    "citizenshipStatus" "CitizenshipStatus" NOT NULL DEFAULT 'NONE',
    "citizenshipUploadedAt" TIMESTAMP(3),
    "panDocUrl" TEXT,
    "panDocStatus" "DocumentStatus" NOT NULL DEFAULT 'NONE',
    "panDocUploadedAt" TIMESTAMP(3),
    "verificationRejectReason" TEXT,
    "verificationRejectedAt" TIMESTAMP(3),
    "province" TEXT,
    "district" TEXT,
    "city" TEXT,
    "area" TEXT,
    "address" TEXT,
    "locationVisibility" "LocationVisibility" NOT NULL DEFAULT 'CITY',
    "showPublicProfile" BOOLEAN NOT NULL DEFAULT true,
    "hideContactDetails" BOOLEAN NOT NULL DEFAULT false,
    "hideSocialLinks" BOOLEAN NOT NULL DEFAULT false,
    "availabilityStatus" "AvailabilityStatus" NOT NULL DEFAULT 'AVAILABLE',
    "providerType" "ProviderType",
    "startingRate" DOUBLE PRECISION,
    "negotiable" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "creator_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" TEXT NOT NULL,
    "creatorProfileId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "startingPrice" DOUBLE PRECISION,
    "pricingModel" "PricingModel" NOT NULL,
    "deliveryTime" TEXT,
    "whatsIncluded" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "ServiceStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_requests" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "budget" DOUBLE PRECISION,
    "status" "ServiceRequestStatus" NOT NULL DEFAULT 'PENDING',
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portfolio_items" (
    "id" TEXT NOT NULL,
    "creatorProfileId" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "category" TEXT,
    "mediaUrl" TEXT,
    "mediaType" "MediaType",
    "externalUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "portfolio_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "availability_schedules" (
    "id" TEXT NOT NULL,
    "creatorProfileId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "availableFrom" TEXT NOT NULL,
    "availableUntil" TEXT NOT NULL,

    CONSTRAINT "availability_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "withdrawals" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "method" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "withdrawals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referrals" (
    "id" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "referredId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" "ReferralStatus" NOT NULL DEFAULT 'PENDING',
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "rewardAmount" DECIMAL(65,30) NOT NULL DEFAULT 500,
    "reviewedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_accounts" (
    "id" TEXT NOT NULL,
    "creatorProfileId" TEXT,
    "businessProfileId" TEXT,
    "platform" TEXT NOT NULL,
    "profileUrl" TEXT NOT NULL,
    "followers" INTEGER NOT NULL DEFAULT 0,
    "connectedViaOAuth" BOOLEAN NOT NULL DEFAULT false,
    "platformUserId" TEXT,
    "avatarUrl" TEXT,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "oauthConnectionType" TEXT,
    "followersSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "social_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_views" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profile_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessName" TEXT,
    "description" TEXT,
    "logoUrl" TEXT,
    "coverImageUrl" TEXT,
    "website" TEXT,
    "categories" TEXT[],
    "panNo" TEXT,
    "location" TEXT,
    "locationLat" DOUBLE PRECISION,
    "locationLng" DOUBLE PRECISION,
    "phone" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "allowDirectMessages" BOOLEAN NOT NULL DEFAULT true,
    "hideContactDetails" BOOLEAN NOT NULL DEFAULT false,
    "showPublicProfile" BOOLEAN NOT NULL DEFAULT true,
    "hideSocialLinks" BOOLEAN NOT NULL DEFAULT false,
    "paymentMethods" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "referralCode" TEXT,
    "socialLinks" JSONB NOT NULL DEFAULT '{}',
    "presenceServices" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "defaultPlatforms" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "defaultCreatorCategories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "defaultBudgetRange" TEXT,
    "panDocUrl" TEXT,
    "panDocStatus" "DocumentStatus" NOT NULL DEFAULT 'NONE',
    "panDocUploadedAt" TIMESTAMP(3),
    "companyRegDocUrl" TEXT,
    "companyRegDocStatus" "DocumentStatus" NOT NULL DEFAULT 'NONE',
    "companyRegDocUploadedAt" TIMESTAMP(3),
    "verificationRejectReason" TEXT,
    "verificationRejectedAt" TIMESTAMP(3),
    "province" TEXT,
    "district" TEXT,
    "city" TEXT,
    "area" TEXT,
    "address" TEXT,
    "locationVisibility" "LocationVisibility" NOT NULL DEFAULT 'CITY',
    "businessSize" "BusinessSize",
    "representingType" "RepresentingType",
    "purpose" "BusinessPurpose",

    CONSTRAINT "business_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_referrals" (
    "id" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "referredId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" "ReferralStatus" NOT NULL DEFAULT 'PENDING',
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "rewardAmount" DECIMAL(65,30) NOT NULL DEFAULT 500,
    "reviewedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "template" TEXT,
    "featureImageUrl" TEXT,
    "category" TEXT NOT NULL,
    "goals" JSONB NOT NULL DEFAULT '[]',
    "platforms" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "minFollowers" INTEGER NOT NULL DEFAULT 0,
    "contentType" TEXT NOT NULL,
    "deliverables" TEXT NOT NULL,
    "deadline" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "locationLat" DOUBLE PRECISION,
    "locationLng" DOUBLE PRECISION,
    "locationType" "LocationType" NOT NULL DEFAULT 'ONSITE',
    "budgetMin" DOUBLE PRECISION NOT NULL,
    "budgetMax" DOUBLE PRECISION NOT NULL,
    "paymentType" TEXT NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'ACTIVE',
    "deletedAt" TIMESTAMP(3),
    "commissionRate" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "creatorsNeeded" INTEGER NOT NULL DEFAULT 1,
    "campaignType" "CampaignType" NOT NULL DEFAULT 'PAID_CAMPAIGN',
    "capacity" INTEGER,
    "eventDate" TIMESTAMP(3),
    "venue" TEXT,
    "benefits" JSONB NOT NULL DEFAULT '[]',
    "eventStatus" "EventStatus" NOT NULL DEFAULT 'OPEN',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "paidAt" TIMESTAMP(3),
    "paymentMethod" TEXT,
    "objective" TEXT,
    "contentGuidelines" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "targetAudience" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "hashtags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sampleCaption" TEXT,
    "approvalRequirements" TEXT,
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "aiPrompt" TEXT,
    "aiSuggestedCategories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "aiSuggestedPlatforms" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "aiNeedsInputFields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "searchVector" tsvector,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applications" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "requirementId" TEXT,
    "creatorId" TEXT NOT NULL,
    "coverLetter" TEXT NOT NULL,
    "proposedRate" DOUBLE PRECISION NOT NULL,
    "timeline" TEXT NOT NULL,
    "socialHandles" JSONB NOT NULL DEFAULT '{}',
    "portfolioUrl" TEXT,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "workStatus" "WorkStatus" NOT NULL DEFAULT 'NONE',
    "workNote" TEXT,
    "revisionRequestedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "deliverableUrls" TEXT,
    "deliverableVideos" JSONB NOT NULL DEFAULT '[]',
    "deliverableFiles" JSONB NOT NULL DEFAULT '[]',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "paidAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "releasedByAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_requirements" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "budgetType" "RequirementBudgetType" NOT NULL DEFAULT 'FIXED',
    "budgetFixed" DOUBLE PRECISION,
    "budgetMin" DOUBLE PRECISION,
    "budgetMax" DOUBLE PRECISION,
    "deliverables" TEXT,
    "description" TEXT,
    "format" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "deadline" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaign_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revision_notes" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "revision_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_transactions" (
    "id" TEXT NOT NULL,
    "type" "PaymentTransactionType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "method" TEXT,
    "applicationId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "creatorId" TEXT,
    "adminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "creatorId2" TEXT,
    "businessId" TEXT,
    "campaignId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "ConversationStatus" NOT NULL DEFAULT 'PENDING',
    "autoAccepted" BOOLEAN NOT NULL DEFAULT false,
    "requestMessage" TEXT,
    "lastMessageAt" TIMESTAMP(3),
    "businessSeenAt" TIMESTAMP(3),
    "creatorSeenAt" TIMESTAMP(3),
    "creator2SeenAt" TIMESTAMP(3),
    "hiddenForCreator" BOOLEAN NOT NULL DEFAULT false,
    "hiddenForBusiness" BOOLEAN NOT NULL DEFAULT false,
    "hiddenForCreator2" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" "MessageType" NOT NULL DEFAULT 'TEXT',
    "attachmentUrl" TEXT,
    "attachmentName" TEXT,
    "attachmentThumbnailUrl" TEXT,
    "attachmentDurationSec" INTEGER,
    "attachmentWidth" INTEGER,
    "attachmentHeight" INTEGER,
    "attachmentSize" INTEGER,
    "attachmentFormat" TEXT,
    "attachmentStatus" "VideoAssetStatus",
    "attachmentWaveform" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "editedAt" TIMESTAMP(3),
    "hiddenForCreator" BOOLEAN NOT NULL DEFAULT false,
    "hiddenForBusiness" BOOLEAN NOT NULL DEFAULT false,
    "hiddenForCreator2" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_conversations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" "AiMessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "toolName" TEXT,
    "toolPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_action_logs" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "input" JSONB NOT NULL,
    "result" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_action_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "legal_sections" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "icon" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "legal_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_templates" (
    "id" TEXT NOT NULL,
    "campaignType" "CampaignType" NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Creator Collaboration Agreement',
    "body" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contracts" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "filledBody" TEXT NOT NULL,
    "terms" JSONB NOT NULL,
    "status" "ContractStatus" NOT NULL DEFAULT 'PENDING_BUSINESS',
    "creatorAgreedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "businessAgreedAt" TIMESTAMP(3),
    "pdfUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faq_articles" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'General',
    "order" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "faq_articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_requests" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "guestName" TEXT,
    "guestEmail" TEXT,
    "topic" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "attachmentUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "issue_reports" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "attachmentUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "issue_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "help_articles" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'General',
    "order" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "help_articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_verifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "refId" TEXT,
    "refType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favorite_businesses" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorite_businesses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_creators" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_creators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_invitations" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "message" TEXT,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creator_analytics" (
    "userId" TEXT NOT NULL,
    "totalProfileViews" INTEGER NOT NULL DEFAULT 0,
    "totalEarnings" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pendingEarnings" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "invitationsReceived" INTEGER NOT NULL DEFAULT 0,
    "applicationsSubmitted" INTEGER NOT NULL DEFAULT 0,
    "applicationsAccepted" INTEGER NOT NULL DEFAULT 0,
    "applicationsRejected" INTEGER NOT NULL DEFAULT 0,
    "activeCampaigns" INTEGER NOT NULL DEFAULT 0,
    "completedCampaigns" INTEGER NOT NULL DEFAULT 0,
    "averageRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "responseTimeAvgMins" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "responseTimeSamples" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "creator_analytics_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "brand_analytics" (
    "userId" TEXT NOT NULL,
    "campaignsCreated" INTEGER NOT NULL DEFAULT 0,
    "activeCampaigns" INTEGER NOT NULL DEFAULT 0,
    "completedCampaigns" INTEGER NOT NULL DEFAULT 0,
    "totalSpend" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "applicationsReceived" INTEGER NOT NULL DEFAULT 0,
    "creatorsHired" INTEGER NOT NULL DEFAULT 0,
    "averageRatingGiven" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ratingsGivenCount" INTEGER NOT NULL DEFAULT 0,
    "responseTimeAvgMins" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "responseTimeSamples" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brand_analytics_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "targetType" "ReportTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "reason" "ReportReason" NOT NULL,
    "description" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'NEW',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "actionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "iconBg" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6B7280',
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "scope" "CategoryScope" NOT NULL DEFAULT 'BOTH',
    "status" "CategoryStatus" NOT NULL DEFAULT 'ACTIVE',
    "group" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platforms" (
    "id" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "iconBg" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6B7280',
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "status" "PlatformStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platforms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "success_stories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "quote" TEXT NOT NULL,
    "photoUrl" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "status" "SuccessStoryStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "success_stories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visitor_chats" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "status" "VisitorChatStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastMessageAt" TIMESTAMP(3),
    "visitorSeenAt" TIMESTAMP(3),
    "adminSeenAt" TIMESTAMP(3),

    CONSTRAINT "visitor_chats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visitor_messages" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "sender" "VisitorMessageSender" NOT NULL,
    "adminId" TEXT,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visitor_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "description" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "device" TEXT,
    "platform" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "performedBy" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_refreshToken_key" ON "sessions"("refreshToken");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "push_tokens_token_key" ON "push_tokens"("token");

-- CreateIndex
CREATE INDEX "push_tokens_userId_idx" ON "push_tokens"("userId");

-- CreateIndex
CREATE INDEX "blocks_blockedId_idx" ON "blocks"("blockedId");

-- CreateIndex
CREATE UNIQUE INDEX "blocks_blockerId_blockedId_key" ON "blocks"("blockerId", "blockedId");

-- CreateIndex
CREATE UNIQUE INDEX "creator_profiles_userId_key" ON "creator_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "creator_profiles_username_key" ON "creator_profiles"("username");

-- CreateIndex
CREATE UNIQUE INDEX "creator_profiles_referralCode_key" ON "creator_profiles"("referralCode");

-- CreateIndex
CREATE INDEX "creator_profiles_isVerified_idx" ON "creator_profiles"("isVerified");

-- CreateIndex
CREATE INDEX "services_creatorProfileId_idx" ON "services"("creatorProfileId");

-- CreateIndex
CREATE INDEX "services_categoryId_idx" ON "services"("categoryId");

-- CreateIndex
CREATE INDEX "service_requests_serviceId_idx" ON "service_requests"("serviceId");

-- CreateIndex
CREATE INDEX "service_requests_businessId_createdAt_idx" ON "service_requests"("businessId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "service_requests_creatorId_status_idx" ON "service_requests"("creatorId", "status");

-- CreateIndex
CREATE INDEX "portfolio_items_creatorProfileId_idx" ON "portfolio_items"("creatorProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "availability_schedules_creatorProfileId_dayOfWeek_key" ON "availability_schedules"("creatorProfileId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "withdrawals_creatorId_idx" ON "withdrawals"("creatorId");

-- CreateIndex
CREATE UNIQUE INDEX "referrals_referredId_key" ON "referrals"("referredId");

-- CreateIndex
CREATE INDEX "referrals_referrerId_idx" ON "referrals"("referrerId");

-- CreateIndex
CREATE UNIQUE INDEX "social_accounts_creatorProfileId_platform_key" ON "social_accounts"("creatorProfileId", "platform");

-- CreateIndex
CREATE UNIQUE INDEX "social_accounts_businessProfileId_platform_key" ON "social_accounts"("businessProfileId", "platform");

-- CreateIndex
CREATE INDEX "profile_views_creatorId_viewedAt_idx" ON "profile_views"("creatorId", "viewedAt");

-- CreateIndex
CREATE INDEX "profile_views_creatorId_businessId_viewedAt_idx" ON "profile_views"("creatorId", "businessId", "viewedAt");

-- CreateIndex
CREATE UNIQUE INDEX "business_profiles_userId_key" ON "business_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "business_profiles_referralCode_key" ON "business_profiles"("referralCode");

-- CreateIndex
CREATE INDEX "business_profiles_isVerified_idx" ON "business_profiles"("isVerified");

-- CreateIndex
CREATE UNIQUE INDEX "business_referrals_referredId_key" ON "business_referrals"("referredId");

-- CreateIndex
CREATE INDEX "business_referrals_referrerId_idx" ON "business_referrals"("referrerId");

-- CreateIndex
CREATE INDEX "campaigns_businessId_idx" ON "campaigns"("businessId");

-- CreateIndex
CREATE INDEX "campaigns_status_idx" ON "campaigns"("status");

-- CreateIndex
CREATE INDEX "campaigns_createdAt_idx" ON "campaigns"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "campaigns_status_createdAt_idx" ON "campaigns"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "campaigns_campaignType_status_idx" ON "campaigns"("campaignType", "status");

-- CreateIndex
CREATE INDEX "campaigns_locationLat_locationLng_idx" ON "campaigns"("locationLat", "locationLng");

-- CreateIndex
CREATE INDEX "campaigns_deletedAt_idx" ON "campaigns"("deletedAt");

-- CreateIndex
CREATE INDEX "applications_campaignId_creatorId_idx" ON "applications"("campaignId", "creatorId");

-- CreateIndex
CREATE INDEX "applications_requirementId_idx" ON "applications"("requirementId");

-- CreateIndex
CREATE INDEX "applications_creatorId_idx" ON "applications"("creatorId");

-- CreateIndex
CREATE INDEX "applications_creatorId_createdAt_idx" ON "applications"("creatorId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "applications_campaignId_status_idx" ON "applications"("campaignId", "status");

-- CreateIndex
CREATE INDEX "campaign_requirements_campaignId_idx" ON "campaign_requirements"("campaignId");

-- CreateIndex
CREATE INDEX "campaign_requirements_categoryId_idx" ON "campaign_requirements"("categoryId");

-- CreateIndex
CREATE INDEX "revision_notes_applicationId_createdAt_idx" ON "revision_notes"("applicationId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "payment_transactions_applicationId_idx" ON "payment_transactions"("applicationId");

-- CreateIndex
CREATE INDEX "payment_transactions_campaignId_idx" ON "payment_transactions"("campaignId");

-- CreateIndex
CREATE INDEX "payment_transactions_createdAt_idx" ON "payment_transactions"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "reviews_toUserId_idx" ON "reviews"("toUserId");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_applicationId_fromUserId_key" ON "reviews"("applicationId", "fromUserId");

-- CreateIndex
CREATE INDEX "conversations_creatorId_hiddenForCreator_lastMessageAt_idx" ON "conversations"("creatorId", "hiddenForCreator", "lastMessageAt" DESC);

-- CreateIndex
CREATE INDEX "conversations_creatorId2_hiddenForCreator2_lastMessageAt_idx" ON "conversations"("creatorId2", "hiddenForCreator2", "lastMessageAt" DESC);

-- CreateIndex
CREATE INDEX "conversations_businessId_hiddenForBusiness_lastMessageAt_idx" ON "conversations"("businessId", "hiddenForBusiness", "lastMessageAt" DESC);

-- CreateIndex
CREATE INDEX "conversations_lastMessageAt_idx" ON "conversations"("lastMessageAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "conversations_creatorId_businessId_key" ON "conversations"("creatorId", "businessId");

-- CreateIndex
CREATE UNIQUE INDEX "conversations_creatorId_creatorId2_key" ON "conversations"("creatorId", "creatorId2");

-- CreateIndex
CREATE INDEX "messages_conversationId_createdAt_idx" ON "messages"("conversationId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ai_conversations_businessId_updatedAt_idx" ON "ai_conversations"("businessId", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "ai_messages_conversationId_createdAt_idx" ON "ai_messages"("conversationId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ai_action_logs_conversationId_createdAt_idx" ON "ai_action_logs"("conversationId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "contract_templates_campaignType_key" ON "contract_templates"("campaignType");

-- CreateIndex
CREATE UNIQUE INDEX "contracts_applicationId_key" ON "contracts"("applicationId");

-- CreateIndex
CREATE INDEX "otp_verifications_userId_expiresAt_idx" ON "otp_verifications"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "notifications_userId_createdAt_idx" ON "notifications"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "notifications_userId_isRead_idx" ON "notifications"("userId", "isRead");

-- CreateIndex
CREATE UNIQUE INDEX "favorite_businesses_creatorId_businessId_key" ON "favorite_businesses"("creatorId", "businessId");

-- CreateIndex
CREATE UNIQUE INDEX "saved_creators_businessId_creatorId_key" ON "saved_creators"("businessId", "creatorId");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_invitations_campaignId_creatorId_key" ON "campaign_invitations"("campaignId", "creatorId");

-- CreateIndex
CREATE INDEX "reports_targetType_targetId_idx" ON "reports"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "reports_status_createdAt_idx" ON "reports"("status", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "categories_key_key" ON "categories"("key");

-- CreateIndex
CREATE UNIQUE INDEX "platforms_key_key" ON "platforms"("key");

-- CreateIndex
CREATE INDEX "visitor_chats_status_lastMessageAt_idx" ON "visitor_chats"("status", "lastMessageAt" DESC);

-- CreateIndex
CREATE INDEX "visitor_messages_chatId_createdAt_idx" ON "visitor_messages"("chatId", "createdAt");

-- CreateIndex
CREATE INDEX "activity_logs_userId_idx" ON "activity_logs"("userId");

-- CreateIndex
CREATE INDEX "activity_logs_action_idx" ON "activity_logs"("action");

-- CreateIndex
CREATE INDEX "activity_logs_createdAt_idx" ON "activity_logs"("createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_tokens" ADD CONSTRAINT "push_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blockedId_fkey" FOREIGN KEY ("blockedId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creator_profiles" ADD CONSTRAINT "creator_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_creatorProfileId_fkey" FOREIGN KEY ("creatorProfileId") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "business_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portfolio_items" ADD CONSTRAINT "portfolio_items_creatorProfileId_fkey" FOREIGN KEY ("creatorProfileId") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availability_schedules" ADD CONSTRAINT "availability_schedules_creatorProfileId_fkey" FOREIGN KEY ("creatorProfileId") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referredId_fkey" FOREIGN KEY ("referredId") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_accounts" ADD CONSTRAINT "social_accounts_creatorProfileId_fkey" FOREIGN KEY ("creatorProfileId") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_accounts" ADD CONSTRAINT "social_accounts_businessProfileId_fkey" FOREIGN KEY ("businessProfileId") REFERENCES "business_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_views" ADD CONSTRAINT "profile_views_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_views" ADD CONSTRAINT "profile_views_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "business_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_profiles" ADD CONSTRAINT "business_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_referrals" ADD CONSTRAINT "business_referrals_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "business_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_referrals" ADD CONSTRAINT "business_referrals_referredId_fkey" FOREIGN KEY ("referredId") REFERENCES "business_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "business_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "campaign_requirements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_requirements" ADD CONSTRAINT "campaign_requirements_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_requirements" ADD CONSTRAINT "campaign_requirements_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revision_notes" ADD CONSTRAINT "revision_notes_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "business_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "creator_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "business_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_creatorId2_fkey" FOREIGN KEY ("creatorId2") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "business_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ai_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_action_logs" ADD CONSTRAINT "ai_action_logs_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ai_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "business_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_requests" ADD CONSTRAINT "support_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issue_reports" ADD CONSTRAINT "issue_reports_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "otp_verifications" ADD CONSTRAINT "otp_verifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorite_businesses" ADD CONSTRAINT "favorite_businesses_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "business_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorite_businesses" ADD CONSTRAINT "favorite_businesses_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_creators" ADD CONSTRAINT "saved_creators_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "business_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_creators" ADD CONSTRAINT "saved_creators_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_invitations" ADD CONSTRAINT "campaign_invitations_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_invitations" ADD CONSTRAINT "campaign_invitations_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_invitations" ADD CONSTRAINT "campaign_invitations_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "business_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitor_messages" ADD CONSTRAINT "visitor_messages_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "visitor_chats"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitor_messages" ADD CONSTRAINT "visitor_messages_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================================
-- Full-text / trigram search support — everything above this line came from
-- `prisma migrate diff` against schema.prisma. schema.prisma can't model
-- pg_trgm, tsvector triggers, or GIN indexes (only the plain "searchVector"
-- tsvector column above is visible to it), so this section restores that
-- raw-SQL-managed layer by hand. Any future `prisma migrate dev` run will
-- generate stray "DROP INDEX ..._trgm_idx" / "DROP INDEX campaigns_searchVector_idx"
-- statements for the same reason — inspect the generated migration.sql and
-- delete those lines before applying.
-- ============================================================================

-- Trigram support: typo-tolerant / partial matching via similarity() on
-- top of exact-token full-text search below.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Weighted full-text index, mirroring relevance order:
--   A: title, category, hashtags       — highest-signal, exact-match-worthy
--   B: location, venue                  — where it's happening
--   C: description, sampleCaption, targetAudience, contentGuidelines — long-form context
CREATE OR REPLACE FUNCTION campaigns_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW."searchVector" :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.category, '')), 'A') ||
    setweight(to_tsvector('english', array_to_string(NEW.hashtags, ' ')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.location, '') || ' ' || coalesce(NEW.venue, '')), 'B') ||
    setweight(to_tsvector('english',
      coalesce(NEW.description, '') || ' ' ||
      coalesce(NEW."sampleCaption", '') || ' ' ||
      array_to_string(NEW."targetAudience", ' ') || ' ' ||
      array_to_string(NEW."contentGuidelines", ' ')
    ), 'C');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS campaigns_search_vector_trigger ON "campaigns";
CREATE TRIGGER campaigns_search_vector_trigger
  BEFORE INSERT OR UPDATE ON "campaigns"
  FOR EACH ROW EXECUTE FUNCTION campaigns_search_vector_update();

CREATE INDEX IF NOT EXISTS "campaigns_searchVector_idx" ON "campaigns" USING GIN ("searchVector");
CREATE INDEX IF NOT EXISTS "campaigns_title_trgm_idx" ON "campaigns" USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "campaigns_category_trgm_idx" ON "campaigns" USING GIN (category gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "business_profiles_businessName_trgm_idx" ON "business_profiles" USING GIN ("businessName" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "business_profiles_description_trgm_idx" ON "business_profiles" USING GIN (description gin_trgm_ops);

