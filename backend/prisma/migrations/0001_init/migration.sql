-- ─────────────────────────────────────────────────────────────────────────────
-- Enums
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TYPE "Role"               AS ENUM ('CREATOR', 'BUSINESS', 'ADMIN');
CREATE TYPE "CampaignStatus"     AS ENUM ('ACTIVE', 'PAUSED', 'CLOSED');
CREATE TYPE "ApplicationStatus"  AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');
CREATE TYPE "ConversationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');
CREATE TYPE "CampaignType"       AS ENUM ('PAID_CAMPAIGN', 'OPEN_EVENT');
CREATE TYPE "EventStatus"        AS ENUM ('OPEN', 'FULL', 'CLOSED');

-- ─────────────────────────────────────────────────────────────────────────────
-- Core identity
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE "users" (
    "id"              TEXT        NOT NULL,
    "email"           TEXT        NOT NULL,
    "password"        TEXT        NOT NULL,
    "role"            "Role"      NOT NULL,
    "isEmailVerified" BOOLEAN     NOT NULL DEFAULT false,
    "refreshToken"    TEXT,
    "phone"           TEXT,
    "isOnboarded"     BOOLEAN     NOT NULL DEFAULT false,
    "isActive"        BOOLEAN     NOT NULL DEFAULT true,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

CREATE TABLE "otp_verifications" (
    "id"        TEXT         NOT NULL,
    "userId"    TEXT         NOT NULL,
    "code"      TEXT         NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "otp_verifications_pkey" PRIMARY KEY ("id")
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Profiles
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE "creator_profiles" (
    "id"             TEXT         NOT NULL,
    "userId"         TEXT         NOT NULL,
    "fullName"       TEXT,
    "username"       TEXT,
    "bio"            TEXT,
    "location"       TEXT,
    "locationLat"    DOUBLE PRECISION,
    "locationLng"    DOUBLE PRECISION,
    "avatarUrl"      TEXT,
    "categories"     TEXT[]       NOT NULL DEFAULT '{}',
    "socialLinks"    JSONB        NOT NULL DEFAULT '{}',
    "portfolioLinks" JSONB        NOT NULL DEFAULT '[]',
    "paymentMethods" TEXT[]       NOT NULL DEFAULT '{}',
    "prefPlatforms"  TEXT[]       NOT NULL DEFAULT '{}',
    "prefLocations"  TEXT[]       NOT NULL DEFAULT '{}',
    "prefBudgetMin"  DOUBLE PRECISION NOT NULL DEFAULT 0,
    "prefBudgetMax"  DOUBLE PRECISION NOT NULL DEFAULT 500,
    "isVerified"     BOOLEAN      NOT NULL DEFAULT false,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,
    CONSTRAINT "creator_profiles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "creator_profiles_userId_key"   ON "creator_profiles"("userId");
CREATE UNIQUE INDEX "creator_profiles_username_key" ON "creator_profiles"("username");

CREATE TABLE "social_accounts" (
    "id"               TEXT         NOT NULL,
    "creatorProfileId" TEXT         NOT NULL,
    "platform"         TEXT         NOT NULL,
    "profileUrl"       TEXT         NOT NULL,
    "followers"        INTEGER      NOT NULL DEFAULT 0,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "social_accounts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "social_accounts_creatorProfileId_platform_key"
    ON "social_accounts"("creatorProfileId", "platform");

CREATE TABLE "business_profiles" (
    "id"                  TEXT         NOT NULL,
    "userId"              TEXT         NOT NULL,
    "businessName"        TEXT,
    "description"         TEXT,
    "logoUrl"             TEXT,
    "website"             TEXT,
    "location"            TEXT,
    "categories"          TEXT[]       NOT NULL DEFAULT '{}',
    "panNo"               TEXT,
    "allowDirectMessages" BOOLEAN      NOT NULL DEFAULT true,
    "hideContactDetails"  BOOLEAN      NOT NULL DEFAULT false,
    "showPublicProfile"   BOOLEAN      NOT NULL DEFAULT true,
    "isVerified"          BOOLEAN      NOT NULL DEFAULT false,
    "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"           TIMESTAMP(3) NOT NULL,
    CONSTRAINT "business_profiles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "business_profiles_userId_key" ON "business_profiles"("userId");

-- ─────────────────────────────────────────────────────────────────────────────
-- Campaigns & Applications
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE "campaigns" (
    "id"             TEXT             NOT NULL,
    "businessId"     TEXT             NOT NULL,
    "title"          TEXT             NOT NULL,
    "description"    TEXT             NOT NULL,
    "template"       TEXT,
    "category"       TEXT             NOT NULL,
    "goals"          JSONB            NOT NULL DEFAULT '[]',
    "platform"       TEXT             NOT NULL,
    "minFollowers"   INTEGER          NOT NULL DEFAULT 0,
    "contentType"    TEXT             NOT NULL,
    "deliverables"   TEXT             NOT NULL,
    "deadline"       TIMESTAMP(3)     NOT NULL,
    "location"       TEXT,
    "budgetMin"      DOUBLE PRECISION NOT NULL,
    "budgetMax"      DOUBLE PRECISION NOT NULL,
    "paymentType"    TEXT             NOT NULL,
    "status"         "CampaignStatus" NOT NULL DEFAULT 'ACTIVE',
    "isFeatured"     BOOLEAN          NOT NULL DEFAULT false,
    "creatorsNeeded" INTEGER          NOT NULL DEFAULT 1,
    "campaignType"   "CampaignType"   NOT NULL DEFAULT 'PAID_CAMPAIGN',
    "eventStatus"    "EventStatus"    NOT NULL DEFAULT 'OPEN',
    "capacity"       INTEGER,
    "eventDate"      TIMESTAMP(3),
    "venue"          TEXT,
    "benefits"       JSONB            NOT NULL DEFAULT '[]',
    "createdAt"      TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3)     NOT NULL,
    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "applications" (
    "id"            TEXT                NOT NULL,
    "campaignId"    TEXT                NOT NULL,
    "creatorId"     TEXT                NOT NULL,
    "coverLetter"   TEXT                NOT NULL,
    "proposedRate"  DOUBLE PRECISION    NOT NULL,
    "timeline"      TEXT                NOT NULL,
    "socialHandles" JSONB               NOT NULL DEFAULT '{}',
    "portfolioUrl"  TEXT,
    "status"        "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt"     TIMESTAMP(3)        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3)        NOT NULL,
    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "applications_campaignId_creatorId_key"
    ON "applications"("campaignId", "creatorId");

CREATE TABLE "campaign_invitations" (
    "id"         TEXT         NOT NULL,
    "campaignId" TEXT         NOT NULL,
    "creatorId"  TEXT         NOT NULL,
    "businessId" TEXT         NOT NULL,
    "message"    TEXT,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "campaign_invitations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "campaign_invitations_campaignId_creatorId_key"
    ON "campaign_invitations"("campaignId", "creatorId");

-- ─────────────────────────────────────────────────────────────────────────────
-- Messaging
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE "conversations" (
    "id"             TEXT                 NOT NULL,
    "creatorId"      TEXT                 NOT NULL,
    "businessId"     TEXT                 NOT NULL,
    "campaignId"     TEXT,
    "status"         "ConversationStatus" NOT NULL DEFAULT 'PENDING',
    "requestMessage" TEXT,
    "lastMessageAt"  TIMESTAMP(3),
    "businessSeenAt" TIMESTAMP(3),
    "creatorSeenAt"  TIMESTAMP(3),
    "createdAt"      TIMESTAMP(3)         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "conversations_creatorId_businessId_key"
    ON "conversations"("creatorId", "businessId");

CREATE TABLE "messages" (
    "id"             TEXT         NOT NULL,
    "conversationId" TEXT         NOT NULL,
    "senderId"       TEXT         NOT NULL,
    "content"        TEXT         NOT NULL,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Social features
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE "favorite_businesses" (
    "id"         TEXT         NOT NULL,
    "creatorId"  TEXT         NOT NULL,
    "businessId" TEXT         NOT NULL,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "favorite_businesses_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "favorite_businesses_creatorId_businessId_key"
    ON "favorite_businesses"("creatorId", "businessId");

CREATE TABLE "saved_creators" (
    "id"         TEXT         NOT NULL,
    "businessId" TEXT         NOT NULL,
    "creatorId"  TEXT         NOT NULL,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "saved_creators_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "saved_creators_businessId_creatorId_key"
    ON "saved_creators"("businessId", "creatorId");

CREATE TABLE "notifications" (
    "id"        TEXT         NOT NULL,
    "userId"    TEXT         NOT NULL,
    "type"      TEXT         NOT NULL,
    "title"     TEXT         NOT NULL,
    "body"      TEXT         NOT NULL,
    "isRead"    BOOLEAN      NOT NULL DEFAULT false,
    "refId"     TEXT,
    "refType"   TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Content & support
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE "help_articles" (
    "id"        TEXT         NOT NULL,
    "question"  TEXT         NOT NULL,
    "answer"    TEXT         NOT NULL,
    "category"  TEXT         NOT NULL DEFAULT 'General',
    "order"     INTEGER      NOT NULL DEFAULT 0,
    "published" BOOLEAN      NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "help_articles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "faq_articles" (
    "id"        TEXT         NOT NULL,
    "question"  TEXT         NOT NULL,
    "answer"    TEXT         NOT NULL,
    "category"  TEXT         NOT NULL DEFAULT 'General',
    "order"     INTEGER      NOT NULL DEFAULT 0,
    "published" BOOLEAN      NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "faq_articles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "legal_sections" (
    "id"        TEXT         NOT NULL,
    "type"      TEXT         NOT NULL,
    "title"     TEXT         NOT NULL,
    "body"      TEXT         NOT NULL,
    "icon"      TEXT,
    "order"     INTEGER      NOT NULL DEFAULT 0,
    "published" BOOLEAN      NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "legal_sections_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "legal_sections_type_idx" ON "legal_sections"("type");

CREATE TABLE "support_requests" (
    "id"        TEXT         NOT NULL,
    "userId"    TEXT,
    "topic"     TEXT         NOT NULL,
    "message"   TEXT         NOT NULL,
    "status"    TEXT         NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "support_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "issue_reports" (
    "id"          TEXT         NOT NULL,
    "userId"      TEXT,
    "type"        TEXT         NOT NULL,
    "description" TEXT         NOT NULL,
    "status"      TEXT         NOT NULL DEFAULT 'OPEN',
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "issue_reports_pkey" PRIMARY KEY ("id")
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Foreign keys
-- ─────────────────────────────────────────────────────────────────────────────

-- users ← profiles
ALTER TABLE "otp_verifications"
    ADD CONSTRAINT "otp_verifications_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "creator_profiles"
    ADD CONSTRAINT "creator_profiles_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "business_profiles"
    ADD CONSTRAINT "business_profiles_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- creator_profiles ← social_accounts
ALTER TABLE "social_accounts"
    ADD CONSTRAINT "social_accounts_creatorProfileId_fkey"
    FOREIGN KEY ("creatorProfileId") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- business_profiles ← campaigns
ALTER TABLE "campaigns"
    ADD CONSTRAINT "campaigns_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "business_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- campaigns / creator_profiles ← applications
ALTER TABLE "applications"
    ADD CONSTRAINT "applications_campaignId_fkey"
    FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "applications"
    ADD CONSTRAINT "applications_creatorId_fkey"
    FOREIGN KEY ("creatorId") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- campaign_invitations
ALTER TABLE "campaign_invitations"
    ADD CONSTRAINT "campaign_invitations_campaignId_fkey"
    FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "campaign_invitations"
    ADD CONSTRAINT "campaign_invitations_creatorId_fkey"
    FOREIGN KEY ("creatorId") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "campaign_invitations"
    ADD CONSTRAINT "campaign_invitations_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "business_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- conversations
ALTER TABLE "conversations"
    ADD CONSTRAINT "conversations_creatorId_fkey"
    FOREIGN KEY ("creatorId") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "conversations"
    ADD CONSTRAINT "conversations_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "business_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "conversations"
    ADD CONSTRAINT "conversations_campaignId_fkey"
    FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- messages
ALTER TABLE "messages"
    ADD CONSTRAINT "messages_conversationId_fkey"
    FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "messages"
    ADD CONSTRAINT "messages_senderId_fkey"
    FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- social features
ALTER TABLE "favorite_businesses"
    ADD CONSTRAINT "favorite_businesses_creatorId_fkey"
    FOREIGN KEY ("creatorId") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "favorite_businesses"
    ADD CONSTRAINT "favorite_businesses_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "business_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "saved_creators"
    ADD CONSTRAINT "saved_creators_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "business_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "saved_creators"
    ADD CONSTRAINT "saved_creators_creatorId_fkey"
    FOREIGN KEY ("creatorId") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "notifications"
    ADD CONSTRAINT "notifications_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- support
ALTER TABLE "support_requests"
    ADD CONSTRAINT "support_requests_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "issue_reports"
    ADD CONSTRAINT "issue_reports_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
