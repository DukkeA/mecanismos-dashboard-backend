-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'SALES', 'MECHANIC');

-- DropForeignKey
ALTER TABLE "account" DROP CONSTRAINT "account_userId_fkey";

-- DropForeignKey
ALTER TABLE "session" DROP CONSTRAINT "session_userId_fkey";

-- DropIndex
DROP INDEX "account_userId_idx";

-- DropIndex
DROP INDEX "session_token_key";

-- AlterTable
ALTER TABLE "account"
DROP COLUMN "accountId",
DROP COLUMN "providerId",
DROP COLUMN "accessToken",
DROP COLUMN "refreshToken",
DROP COLUMN "idToken",
DROP COLUMN "accessTokenExpiresAt",
DROP COLUMN "refreshTokenExpiresAt",
DROP COLUMN "scope",
DROP COLUMN "password",
ADD COLUMN "passwordHash" TEXT NOT NULL DEFAULT '',
ADD COLUMN "passwordUpdatedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "session"
RENAME COLUMN "token" TO "tokenDigest";

-- AlterTable
ALTER TABLE "session"
ADD COLUMN "familyId" TEXT NOT NULL DEFAULT '',
ADD COLUMN "lastUsedAt" TIMESTAMP(3),
ADD COLUMN "replacedBySessionId" TEXT,
ADD COLUMN "revokedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "user"
DROP COLUMN "emailVerified",
DROP COLUMN "image",
ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "lastLoginAt" TIMESTAMP(3),
ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'ADMIN';

-- DropTable
DROP TABLE "verification";

-- CreateIndex
CREATE UNIQUE INDEX "account_userId_key" ON "account"("userId");

-- CreateIndex
CREATE INDEX "session_familyId_idx" ON "session"("familyId");

-- CreateIndex
CREATE UNIQUE INDEX "session_replacedBySessionId_key" ON "session"("replacedBySessionId");

-- CreateIndex
CREATE UNIQUE INDEX "session_tokenDigest_key" ON "session"("tokenDigest");

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_replacedBySessionId_fkey" FOREIGN KEY ("replacedBySessionId") REFERENCES "session"("id") ON DELETE SET NULL ON UPDATE CASCADE;
