-- AlterTable
ALTER TABLE "User" ADD COLUMN "telegramChatId" TEXT,
ADD COLUMN "telegramLinkToken" TEXT,
ADD COLUMN "telegramLinkedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "User_telegramChatId_key" ON "User"("telegramChatId");

-- CreateIndex
CREATE UNIQUE INDEX "User_telegramLinkToken_key" ON "User"("telegramLinkToken");

-- AlterTable
ALTER TABLE "PriceAlert" ADD COLUMN "anyDestination" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "promoOnly" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "DealSource" ADD COLUMN "lastIngestAt" TIMESTAMP(3),
ADD COLUMN "lastIngestCount" INTEGER,
ADD COLUMN "lastIngestError" TEXT,
ADD COLUMN "lastIngestDurationMs" INTEGER;

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
