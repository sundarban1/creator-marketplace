ALTER TABLE "creator_profiles" ADD COLUMN IF NOT EXISTS "paymentMethods" TEXT[] NOT NULL DEFAULT '{}';
