-- Add relatedJobId column to credit_transactions table
-- This column is already in the Prisma schema but missing from the database

ALTER TABLE credit_transactions
ADD COLUMN IF NOT EXISTS "relatedJobId" TEXT;

-- Add index for better performance on related job lookups
CREATE INDEX IF NOT EXISTS "credit_transactions_relatedJobId_idx"
ON credit_transactions("relatedJobId");

-- Add foreign key constraint to generation_jobs if needed
-- ALTER TABLE credit_transactions
-- ADD CONSTRAINT credit_transactions_relatedJobId_fkey
-- FOREIGN KEY ("relatedJobId") REFERENCES generation_jobs(id)
-- ON DELETE SET NULL;
