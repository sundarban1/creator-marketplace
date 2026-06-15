CREATE TABLE IF NOT EXISTS "faq_articles" (
    "id"        TEXT NOT NULL,
    "question"  TEXT NOT NULL,
    "answer"    TEXT NOT NULL,
    "category"  TEXT NOT NULL DEFAULT 'General',
    "order"     INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "faq_articles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "support_requests" (
    "id"        TEXT NOT NULL,
    "userId"    TEXT,
    "topic"     TEXT NOT NULL,
    "message"   TEXT NOT NULL,
    "status"    TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "support_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "issue_reports" (
    "id"          TEXT NOT NULL,
    "userId"      TEXT,
    "type"        TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status"      TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "issue_reports_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "support_requests" ADD CONSTRAINT "support_requests_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "issue_reports" ADD CONSTRAINT "issue_reports_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
