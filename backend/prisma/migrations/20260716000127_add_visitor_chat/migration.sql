-- CreateEnum
CREATE TYPE "VisitorChatStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "VisitorMessageSender" AS ENUM ('VISITOR', 'ADMIN');

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

-- CreateIndex
CREATE INDEX "visitor_chats_status_lastMessageAt_idx" ON "visitor_chats"("status", "lastMessageAt" DESC);

-- CreateIndex
CREATE INDEX "visitor_messages_chatId_createdAt_idx" ON "visitor_messages"("chatId", "createdAt");

-- AddForeignKey
ALTER TABLE "visitor_messages" ADD CONSTRAINT "visitor_messages_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "visitor_chats"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitor_messages" ADD CONSTRAINT "visitor_messages_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

