-- Make phone optional on users (phone no longer required at signup)
ALTER TABLE "users" ALTER COLUMN "phone" DROP NOT NULL;

-- Make fullName optional on creator_profiles (collected during onboarding)
ALTER TABLE "creator_profiles" ALTER COLUMN "fullName" DROP NOT NULL;

-- Make businessName optional on business_profiles (collected during onboarding)
ALTER TABLE "business_profiles" ALTER COLUMN "businessName" DROP NOT NULL;
