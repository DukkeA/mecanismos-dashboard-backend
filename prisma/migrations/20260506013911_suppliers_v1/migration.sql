-- AlterTable
ALTER TABLE "account" ALTER COLUMN "passwordHash" DROP DEFAULT;

-- AlterTable
ALTER TABLE "session" ALTER COLUMN "familyId" DROP DEFAULT;
