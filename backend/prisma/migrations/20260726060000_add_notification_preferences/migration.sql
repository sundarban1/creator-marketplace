-- AlterTable
ALTER TABLE "users" ADD COLUMN     "pushNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "emailNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true;
