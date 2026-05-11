-- CreateTable
CREATE TABLE "AppSettingsAuditHistory" (
    "id" TEXT NOT NULL,
    "appSettingsId" INTEGER NOT NULL DEFAULT 1,
    "actorUserId" TEXT NOT NULL,
    "changedFields" TEXT[] NOT NULL,
    "beforeValues" JSONB NOT NULL,
    "afterValues" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppSettingsAuditHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AppSettingsAuditHistory_appSettingsId_createdAt_idx" ON "AppSettingsAuditHistory"("appSettingsId", "createdAt");

-- CreateIndex
CREATE INDEX "AppSettingsAuditHistory_actorUserId_createdAt_idx" ON "AppSettingsAuditHistory"("actorUserId", "createdAt");

-- AddForeignKey
ALTER TABLE "AppSettingsAuditHistory" ADD CONSTRAINT "AppSettingsAuditHistory_appSettingsId_fkey" FOREIGN KEY ("appSettingsId") REFERENCES "AppSettings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
