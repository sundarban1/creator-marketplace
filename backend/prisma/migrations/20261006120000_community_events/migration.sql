-- CreateEnum
CREATE TYPE "CommunityEventType" AS ENUM ('MEETUP', 'WORKSHOP', 'TRAINING', 'NETWORKING', 'COMMUNITY_EVENT', 'OTHER');

-- CreateEnum
CREATE TYPE "CommunityEventStatus" AS ENUM ('UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "community_events" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "shortDescription" TEXT NOT NULL,
    "description" TEXT,
    "eventType" "CommunityEventType" NOT NULL DEFAULT 'MEETUP',
    "statusOverride" "CommunityEventStatus",
    "coverImageUrl" TEXT,
    "startDateTime" TIMESTAMP(3) NOT NULL,
    "endDateTime" TIMESTAMP(3),
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kathmandu',
    "venueName" TEXT,
    "address" TEXT,
    "city" TEXT,
    "country" TEXT DEFAULT 'Nepal',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "mapsUrl" TEXT,
    "videoUrl" TEXT,
    "registrationEnabled" BOOLEAN NOT NULL DEFAULT false,
    "registrationUrl" TEXT,
    "registrationDeadline" TIMESTAMP(3),
    "maxAttendees" INTEGER,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "ogImageUrl" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_event_images" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "community_event_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_event_speakers" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT,
    "role" TEXT,
    "organization" TEXT,
    "bio" TEXT,
    "profileUrl" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "community_event_speakers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_event_highlights" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "community_event_highlights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_event_agenda_items" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "time" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "community_event_agenda_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_event_partners" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT,
    "websiteUrl" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "community_event_partners_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "community_events_slug_key" ON "community_events"("slug");

-- CreateIndex
CREATE INDEX "community_events_published_startDateTime_idx" ON "community_events"("published", "startDateTime");

-- CreateIndex
CREATE INDEX "community_event_images_eventId_order_idx" ON "community_event_images"("eventId", "order");

-- CreateIndex
CREATE INDEX "community_event_speakers_eventId_order_idx" ON "community_event_speakers"("eventId", "order");

-- CreateIndex
CREATE INDEX "community_event_highlights_eventId_order_idx" ON "community_event_highlights"("eventId", "order");

-- CreateIndex
CREATE INDEX "community_event_agenda_items_eventId_order_idx" ON "community_event_agenda_items"("eventId", "order");

-- CreateIndex
CREATE INDEX "community_event_partners_eventId_order_idx" ON "community_event_partners"("eventId", "order");

-- AddForeignKey
ALTER TABLE "community_event_images" ADD CONSTRAINT "community_event_images_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "community_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_event_speakers" ADD CONSTRAINT "community_event_speakers_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "community_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_event_highlights" ADD CONSTRAINT "community_event_highlights_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "community_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_event_agenda_items" ADD CONSTRAINT "community_event_agenda_items_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "community_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_event_partners" ADD CONSTRAINT "community_event_partners_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "community_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

