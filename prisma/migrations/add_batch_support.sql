-- Add batch support
ALTER TABLE "generation_jobs" ADD COLUMN "batchJobId" TEXT;
ALTER TABLE "variant_jobs" ADD COLUMN "metadata" JSONB;

-- Create batch_jobs table
CREATE TABLE IF NOT EXISTS "batch_jobs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "totalJobs" INTEGER NOT NULL,
    "completedJobs" INTEGER NOT NULL DEFAULT 0,
    "failedJobs" INTEGER NOT NULL DEFAULT 0,
    "outputZipUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "batch_jobs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Add foreign key for generation_jobs
ALTER TABLE "generation_jobs"
ADD CONSTRAINT "generation_jobs_batchJobId_fkey"
FOREIGN KEY ("batchJobId") REFERENCES "batch_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add indexes
CREATE INDEX "batch_jobs_userId_idx" ON "batch_jobs"("userId");
CREATE INDEX "batch_jobs_status_idx" ON "batch_jobs"("status");
CREATE INDEX "batch_jobs_createdAt_idx" ON "batch_jobs"("createdAt");
CREATE INDEX "generation_jobs_batchJobId_idx" ON "generation_jobs"("batchJobId");
