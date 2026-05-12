-- AlterTable
ALTER TABLE "account"
ADD COLUMN "recoveryPhraseHash" TEXT,
ADD COLUMN "recoveryPhraseGeneratedAt" TIMESTAMP(3),
ADD COLUMN "recoveryPhraseConsumedAt" TIMESTAMP(3);
