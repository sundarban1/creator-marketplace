-- Sliding sessions: refresh-token rotation with the previous token still accepted.
ALTER TABLE "sessions" ADD COLUMN "previousRefreshToken" TEXT;
ALTER TABLE "sessions" ADD COLUMN "expiresAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "sessions_previousRefreshToken_key" ON "sessions"("previousRefreshToken");
CREATE INDEX "sessions_expiresAt_idx" ON "sessions"("expiresAt");
