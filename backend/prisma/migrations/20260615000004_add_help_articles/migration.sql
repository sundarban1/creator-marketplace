CREATE TABLE IF NOT EXISTS "help_articles" (
    "id"        TEXT NOT NULL,
    "question"  TEXT NOT NULL,
    "answer"    TEXT NOT NULL,
    "category"  TEXT NOT NULL DEFAULT 'General',
    "order"     INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "help_articles_pkey" PRIMARY KEY ("id")
);
