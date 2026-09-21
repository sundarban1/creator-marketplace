-- CreateTable
CREATE TABLE "biometric_credentials" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "biometric_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "biometric_credentials_userId_idx" ON "biometric_credentials"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "biometric_credentials_userId_deviceId_key" ON "biometric_credentials"("userId", "deviceId");

-- AddForeignKey
ALTER TABLE "biometric_credentials" ADD CONSTRAINT "biometric_credentials_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
