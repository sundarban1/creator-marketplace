-- AlterTable
ALTER TABLE "campaigns" ADD COLUMN     "locationLat" DOUBLE PRECISION,
ADD COLUMN     "locationLng" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "creator_profiles" ADD COLUMN     "nearbyRadiusKm" INTEGER NOT NULL DEFAULT 25,
ADD COLUMN     "nearbyUseHomeLocation" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "campaigns_locationLat_locationLng_idx" ON "campaigns"("locationLat", "locationLng");

