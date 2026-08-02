-- AlterTable
ALTER TABLE "applications" ADD COLUMN     "deliverableFiles" JSONB NOT NULL DEFAULT '[]';
