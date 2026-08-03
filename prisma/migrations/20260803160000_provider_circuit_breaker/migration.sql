-- AlterTable
ALTER TABLE "ProviderStatus" ADD COLUMN     "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "circuitState" TEXT NOT NULL DEFAULT 'closed',
ADD COLUMN     "circuitOpenedAt" TIMESTAMP(3);
