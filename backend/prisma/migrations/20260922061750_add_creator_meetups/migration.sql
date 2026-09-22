-- CreateEnum
CREATE TYPE "MeetupRegistrationPhase" AS ENUM ('DRAFT', 'OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "MeetupStatus" AS ENUM ('UPCOMING', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MeetupCreatorType" AS ENUM ('CONTENT_CREATOR', 'UGC_CREATOR', 'INFLUENCER', 'YOUTUBER', 'SOCIAL_MEDIA_CREATOR', 'BLOGGER_WRITER', 'PHOTOGRAPHER_VIDEOGRAPHER', 'OTHER');

-- CreateEnum
CREATE TYPE "MeetupAttendancePreference" AS ENUM ('YES', 'NOT_SURE');

-- CreateEnum
CREATE TYPE "MeetupRegistrationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateTable
CREATE TABLE "creator_meetups" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "district" TEXT,
    "province" TEXT,
    "country" TEXT NOT NULL DEFAULT 'Nepal',
    "description" TEXT,
    "registrationStatus" "MeetupRegistrationPhase" NOT NULL DEFAULT 'DRAFT',
    "registrationStartsAt" TIMESTAMP(3),
    "registrationEndsAt" TIMESTAMP(3),
    "eventDate" TIMESTAMP(3),
    "eventStartTime" TEXT,
    "eventEndTime" TEXT,
    "venueName" TEXT,
    "venueAddress" TEXT,
    "capacity" INTEGER,
    "status" "MeetupStatus" NOT NULL DEFAULT 'UPCOMING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "creator_meetups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creator_meetup_registrations" (
    "id" TEXT NOT NULL,
    "meetupId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "email" TEXT,
    "creatorTypes" "MeetupCreatorType"[],
    "otherCreatorType" TEXT,
    "socialMediaProfile" TEXT,
    "attendancePreference" "MeetupAttendancePreference" NOT NULL,
    "message" TEXT,
    "status" "MeetupRegistrationStatus" NOT NULL DEFAULT 'PENDING',
    "acceptedAt" TIMESTAMP(3),
    "acceptedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectedBy" TEXT,
    "invitationSentAt" TIMESTAMP(3),
    "invitationEmailStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "creator_meetup_registrations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "creator_meetups_slug_key" ON "creator_meetups"("slug");

-- CreateIndex
CREATE INDEX "creator_meetups_status_registrationStatus_idx" ON "creator_meetups"("status", "registrationStatus");

-- CreateIndex
CREATE INDEX "creator_meetup_registrations_meetupId_status_idx" ON "creator_meetup_registrations"("meetupId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "creator_meetup_registrations_meetupId_creatorId_key" ON "creator_meetup_registrations"("meetupId", "creatorId");

-- AddForeignKey
ALTER TABLE "creator_meetup_registrations" ADD CONSTRAINT "creator_meetup_registrations_meetupId_fkey" FOREIGN KEY ("meetupId") REFERENCES "creator_meetups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creator_meetup_registrations" ADD CONSTRAINT "creator_meetup_registrations_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
