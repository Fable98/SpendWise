-- CreateEnum
CREATE TYPE "TransactionSource" AS ENUM ('MANUAL', 'GPAY_NOTIFICATION', 'BANK_SMS', 'GMAIL_RECEIPT', 'CSV_IMPORT');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('PROCESSED', 'PENDING_REVIEW', 'REJECTED');

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "confidence" DECIMAL(3,2),
ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "fingerprint" TEXT,
ADD COLUMN     "merchantName" TEXT,
ADD COLUMN     "rawPayload" TEXT,
ADD COLUMN     "source" "TransactionSource" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "syncStatus" "SyncStatus" NOT NULL DEFAULT 'PROCESSED';

-- CreateTable
CREATE TABLE "integration_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tokenPrefix" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category_rules" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "categoryId" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "category_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "integration_tokens_tokenHash_key" ON "integration_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "integration_tokens_tokenPrefix_isActive_idx" ON "integration_tokens"("tokenPrefix", "isActive");

-- CreateIndex
CREATE INDEX "integration_tokens_userId_idx" ON "integration_tokens"("userId");

-- CreateIndex
CREATE INDEX "category_rules_userId_idx" ON "category_rules"("userId");

-- CreateIndex
CREATE INDEX "category_rules_keyword_idx" ON "category_rules"("keyword");

-- CreateIndex
CREATE UNIQUE INDEX "category_rules_userId_keyword_key" ON "category_rules"("userId", "keyword");

-- CreateIndex
CREATE INDEX "transactions_userId_fingerprint_idx" ON "transactions"("userId", "fingerprint");

-- CreateIndex
CREATE INDEX "transactions_userId_transactionDate_amount_idx" ON "transactions"("userId", "transactionDate", "amount");

-- CreateIndex
CREATE INDEX "transactions_userId_source_idx" ON "transactions"("userId", "source");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_userId_externalId_key" ON "transactions"("userId", "externalId");

-- AddForeignKey
ALTER TABLE "integration_tokens" ADD CONSTRAINT "integration_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_rules" ADD CONSTRAINT "category_rules_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_rules" ADD CONSTRAINT "category_rules_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
