-- AlterEnum
ALTER TYPE "WalletTransactionType" ADD VALUE 'PROMO_REDEMPTION_DEBIT';

-- DropForeignKey
ALTER TABLE "creator_points_accounts" DROP CONSTRAINT "creator_points_accounts_creatorId_fkey";

-- DropForeignKey
ALTER TABLE "creator_points_ledger" DROP CONSTRAINT "creator_points_ledger_creatorId_fkey";

-- DropTable
DROP TABLE "creator_points_accounts";

-- DropTable
DROP TABLE "creator_points_ledger";

-- DropEnum
DROP TYPE "CreatorPointsTransactionType";

