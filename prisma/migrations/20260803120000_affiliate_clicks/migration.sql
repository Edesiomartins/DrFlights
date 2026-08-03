-- CreateTable
CREATE TABLE "AffiliateClick" (
    "id" TEXT NOT NULL,
    "placement" TEXT NOT NULL,
    "partner" TEXT,
    "slotId" TEXT,
    "targetUrl" TEXT NOT NULL,
    "userAgent" TEXT,
    "referer" TEXT,
    "ipHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AffiliateClick_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AffiliateClick_placement_createdAt_idx" ON "AffiliateClick"("placement", "createdAt");

-- CreateIndex
CREATE INDEX "AffiliateClick_partner_createdAt_idx" ON "AffiliateClick"("partner", "createdAt");

-- CreateIndex
CREATE INDEX "AffiliateClick_slotId_createdAt_idx" ON "AffiliateClick"("slotId", "createdAt");

-- CreateIndex
CREATE INDEX "AffiliateClick_createdAt_idx" ON "AffiliateClick"("createdAt");
