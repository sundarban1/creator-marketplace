CREATE TABLE IF NOT EXISTS "legal_sections" (
    "id"        TEXT NOT NULL,
    "type"      TEXT NOT NULL,
    "title"     TEXT NOT NULL,
    "body"      TEXT NOT NULL,
    "icon"      TEXT,
    "order"     INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "legal_sections_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "legal_sections_type_idx" ON "legal_sections"("type");
