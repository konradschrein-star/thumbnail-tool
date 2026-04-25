# Credit System Security Hardening - Design Specification

**Date:** 2026-04-25
**Author:** Claude Sonnet 4.5
**Status:** Approved

---

## 1. Context

### Problem Statement

The Thumbnail Creator V2 credit system has critical security vulnerabilities in batch operations that allow users to bypass credit deduction entirely:

1. **Batch Upload Exploit:** Users can upload CSV files with up to 500 rows and create 500 generation jobs without any credit validation or deduction
2. **Batch Translation Exploit:** Users can request translations of completed batches in multiple languages, creating thousands of variant jobs (500 × 5 languages = 2,500 jobs) with zero credit deduction
3. **Negative Balance Risk:** Without proper validation, users could theoretically have negative credit balances

### Current State

**What Works:**
- Single thumbnail generation (`/api/generate`) has bulletproof credit deduction using atomic Prisma transactions with Serializable isolation
- Race condition protection prevents concurrent requests from overdrawing credits
- Comprehensive audit logging via `credit_transactions` table
- Admin bypass functionality working as intended

**What's Broken:**
- `/app/api/batch/upload/route.ts` - Creates batch_jobs and generation_jobs without checking or deducting credits
- `/app/api/batch/translate/route.ts` - Creates variant jobs without validation or deduction

### Requirements

**Hard Security Constraints:**
- Users with 0 credits must be unable to create any batch jobs
- Users with 1 credit attempting to create a 10,000-job batch must be rejected immediately
- No negative credit balances allowed under any circumstances
- All credit deductions must be atomic (all-or-nothing transactions)
- Race conditions must be prevented (concurrent batch uploads from same user)

**Non-Requirements (Explicitly Out of Scope):**
- Frontend credit warnings or balance displays (can add later)
- User-facing confirmation dialogs
- Credit reservation system
- Refund mechanisms for failed jobs (current "no refunds" policy remains)

---

## 2. Solution Architecture

### Overview

Implement upfront credit deduction for all batch operations using the same atomic transaction pattern that already secures single thumbnail generation. Credits are deducted BEFORE any batch_jobs or generation_jobs records are created, ensuring payment happens before service delivery.

### Credit Deduction Flow

```
POST /api/batch/upload (CSV with N rows)
    ↓
├─ [EXISTING] Parse and validate CSV
├─ [EXISTING] Check file size, format, required fields
├─ [EXISTING] Validate channelId/archetypeId exist
│
├─ [NEW] Check user credit balance
│   └─ If balance < N → Return 402 Insufficient Credits + abort
│
├─ [NEW] Deduct credits atomically:
│   ├─ Lock user row (Serializable isolation)
│   ├─ Validate balance >= N (inside transaction)
│   ├─ Update user.credits -= N
│   ├─ Create batch_jobs record
│   ├─ Create credit_transactions record
│   └─ Commit (all-or-nothing)
│
├─ [EXISTING] For each row:
│   ├─ Create generation_jobs record
│   └─ Queue to BullMQ
│
└─ [EXISTING] Return success response
```

### Transaction Atomicity

All credit deductions use Prisma's Serializable isolation level to prevent race conditions:

```typescript
await prisma.$transaction(
  async (tx) => {
    // User row locked during entire transaction
    const user = await tx.users.findUnique({ where: { id: userId } });

    // Validation inside transaction (critical for atomicity)
    if (user.credits < requiredCredits) {
      throw new InsufficientCreditsError(requiredCredits, user.credits);
    }

    // All operations atomic
    await tx.users.update({...});      // Deduct credits
    await tx.batch_jobs.create({...}); // Create batch
    await tx.credit_transactions.create({...}); // Audit log
  },
  { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
);
```

**Why This Prevents Exploits:**
- User row is locked from the moment `findUnique` executes until transaction commits
- Concurrent requests queue up and process serially
- Second request sees updated balance after first commits
- If balance check passes at start but credits are deducted by another transaction before commit, Serializable isolation will abort and retry

---

## 3. Implementation Details

### 3.1 New Credit Service Function

**File:** `lib/credit-service.ts`

**Function:** `deductCreditsForBatch()`

**Signature:**
```typescript
export async function deductCreditsForBatch(
  userId: string,
  batchSize: number,
  batchName: string,
  reason: string
): Promise<{
  batchJob: batch_jobs;
  creditsRemaining: number;
}>
```

**Behavior:**
- Validates user has sufficient credits (throws `InsufficientCreditsError` if not)
- Deducts credits atomically
- Creates `batch_jobs` record in same transaction
- Logs transaction to `credit_transactions` with `related_batch_id`
- Returns created batch and remaining balance
- Uses 10-second transaction timeout
- Uses Serializable isolation level

**Error Cases:**
- Throws `InsufficientCreditsError` if `user.credits < batchSize`
- Throws `Error` if user not found
- Throws `PrismaClientKnownRequestError` if transaction fails/times out

---

### 3.2 Batch Upload Security

**File:** `app/api/batch/upload/route.ts`

**Changes Required:**

1. **Pre-validation (before deduction):**
   ```typescript
   const requiredCredits = rows.length;
   const shouldDeductCredits = userRole !== 'ADMIN';

   if (shouldDeductCredits) {
     const userBalance = await CreditService.getUserCredits(userId);

     if (userBalance < requiredCredits) {
       return NextResponse.json({
         error: "Insufficient credits",
         creditsRequired: requiredCredits,
         creditsAvailable: userBalance,
         message: `You need ${requiredCredits} credits to create this batch. You have ${userBalance}.`
       }, { status: 402 });
     }
   }
   ```

2. **Replace batch creation with atomic deduction:**
   ```typescript
   // OLD (remove):
   const batchJob = await prisma.batch_jobs.create({...});

   // NEW (replace with):
   let batchJob;
   let creditsRemaining;

   if (shouldDeductCredits) {
     const result = await CreditService.deductCreditsForBatch(
       userId,
       rows.length,
       batchName,
       `Batch upload: ${batchName} (${rows.length} thumbnails)`
     );
     batchJob = result.batchJob;
     creditsRemaining = result.creditsRemaining;
   } else {
     // Admin: create batch without deduction
     batchJob = await prisma.batch_jobs.create({
       data: {
         name: batchName,
         userId,
         status: 'PENDING',
         totalJobs: rows.length,
         credits_deducted: null // Admins don't consume credits
       }
     });
   }
   ```

3. **Rate limiting:**
   ```typescript
   const batchUploadLimiter = rateLimit({
     windowMs: 60 * 60 * 1000, // 1 hour
     max: 10, // 10 uploads per hour
     message: "Too many batch uploads. Please try again later."
   });

   // Apply in route handler
   await batchUploadLimiter(req, res);
   ```

---

### 3.3 Batch Translation Security

**File:** `app/api/batch/translate/route.ts`

**Changes Required:**

1. **Calculate required credits:**
   ```typescript
   // Fetch completed jobs for this batch
   const completedJobs = await prisma.generation_jobs.findMany({
     where: {
       batchJobId,
       status: 'completed'
     }
   });

   const requiredCredits = completedJobs.length * languages.length;
   ```

2. **Validate and deduct:**
   ```typescript
   const shouldDeductCredits = userRole !== 'ADMIN';

   if (shouldDeductCredits) {
     const userBalance = await CreditService.getUserCredits(userId);

     if (userBalance < requiredCredits) {
       return NextResponse.json({
         error: "Insufficient credits",
         creditsRequired: requiredCredits,
         creditsAvailable: userBalance,
         message: `Translating ${completedJobs.length} thumbnails into ${languages.length} language(s) requires ${requiredCredits} credits.`
       }, { status: 402 });
     }

     // Deduct credits (NOT creating batch, so use deductCreditsForJob)
     await CreditService.deductCreditsForJob(
       userId,
       requiredCredits,
       `Batch translation: ${languages.length} languages for batch ${batchJobId}`,
       null // No specific job ID (this creates multiple variant jobs)
     );
   }
   ```

3. **Rate limiting:**
   ```typescript
   const batchTranslateLimiter = rateLimit({
     windowMs: 60 * 60 * 1000, // 1 hour
     max: 20, // 20 translation requests per hour
     message: "Too many translation requests. Please try again later."
   });
   ```

---

### 3.4 Database Schema Changes

**File:** `prisma/schema.prisma`

**Change:** Add `credits_deducted` field to `batch_jobs` model

```prisma
model batch_jobs {
  id              String            @id @default(cuid())
  name            String
  userId          String
  status          String            @default("PENDING")
  totalJobs       Int
  completedJobs   Int               @default(0)
  failedJobs      Int               @default(0)
  outputZipUrl    String?
  credits_deducted Int?             // NEW: Track credits for reconciliation
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt
  users           users             @relation(fields: [userId], references: [id], onDelete: Cascade)
  generation_jobs generation_jobs[]
}
```

**Migration:**
```bash
npx prisma migrate dev --name add_credits_to_batch_jobs
```

**Backfill (optional):**
```sql
-- Set credits_deducted = totalJobs for existing batches
UPDATE batch_jobs
SET credits_deducted = totalJobs
WHERE credits_deducted IS NULL
  AND createdAt < '2026-04-25';
```

---

## 4. Error Handling

### HTTP Status Codes

| Status | Meaning | When Used |
|--------|---------|-----------|
| 402 Payment Required | Insufficient credits | User tries to create batch without enough credits |
| 400 Bad Request | Validation error | Invalid CSV format, missing fields, file too large |
| 429 Too Many Requests | Rate limit exceeded | More than 10 batch uploads/hour or 20 translations/hour |
| 500 Internal Server Error | Transaction failure | Database error, timeout, unexpected exception |

### Error Response Format

**402 Insufficient Credits:**
```json
{
  "error": "Insufficient credits",
  "creditsRequired": 500,
  "creditsAvailable": 250,
  "message": "You need 500 credits to create this batch. You have 250."
}
```

**500 Transaction Failure:**
```json
{
  "error": "Transaction failed",
  "message": "Could not process credit deduction. Please try again."
}
```

### Exception Handling

```typescript
try {
  const result = await CreditService.deductCreditsForBatch(...);
} catch (error) {
  if (error instanceof CreditService.InsufficientCreditsError) {
    return NextResponse.json({
      error: "Insufficient credits",
      creditsRequired: error.required,
      creditsAvailable: error.available,
      message: `You need ${error.required} credits. You have ${error.available}.`
    }, { status: 402 });
  }

  console.error("Credit deduction failed:", error);
  return NextResponse.json({
    error: "Transaction failed",
    message: "Could not process credit deduction. Please try again."
  }, { status: 500 });
}
```

---

## 5. Security Guarantees

### Attack Scenarios & Mitigations

| Attack Vector | Mitigation | Status |
|---------------|------------|--------|
| Upload 500-row CSV with 0 credits | Pre-check rejects with 402 before deduction | ✅ Prevented |
| Upload 10,000-row CSV with 1 credit | Validation rejects (max 500 rows + insufficient credits) | ✅ Prevented |
| Request batch translation with 0 credits | Pre-check + deduction before creating variant jobs | ✅ Prevented |
| Concurrent batch uploads to overdraw | Serializable isolation locks user row | ✅ Prevented |
| Race: 2 requests, 10 credits, both need 8 | First succeeds (2 left), second rejected | ✅ Prevented |
| Bypass validation via direct API call | Server-side validation (client has no control) | ✅ Prevented |
| Manipulate client to show inflated balance | Balance read from database only | ✅ Prevented |
| Admin account compromise creating unlimited batches | Admin bypass is intentional (secure admin credentials) | ⚠️ Admin responsibility |

### Negative Balance Prevention

**Primary Defense:** Validation inside atomic transaction
```typescript
// Inside Serializable transaction:
if (user.credits < requiredCredits) {
  throw new InsufficientCreditsError(requiredCredits, user.credits);
}
```

**Optional Additional Defense:** Database constraint
```sql
ALTER TABLE users ADD CONSTRAINT credits_non_negative CHECK (credits >= 0);
```

### Concurrency Safety

**Scenario:** User A has 10 credits, submits two 8-credit batch requests simultaneously

**What Happens:**
1. Request 1 enters transaction, locks user row, sees balance=10
2. Request 2 enters transaction, WAITS (row locked by Request 1)
3. Request 1 deducts 8 credits, commits, unlocks row
4. Request 2 acquires lock, sees balance=2
5. Request 2 validation fails (2 < 8), throws `InsufficientCreditsError`
6. Request 2 rolled back, returns 402 to user

**Result:** No overdraw. One request succeeds, one rejected.

---

## 6. Testing Strategy

### Unit Tests

**File:** `lib/credit-service.test.ts`

```typescript
describe('deductCreditsForBatch', () => {
  it('deducts credits and creates batch when sufficient balance', async () => {
    // User with 500 credits
    const result = await CreditService.deductCreditsForBatch(
      userId, 100, 'Test Batch', 'Test'
    );
    expect(result.creditsRemaining).toBe(400);
    expect(result.batchJob.totalJobs).toBe(100);
  });

  it('throws InsufficientCreditsError when balance too low', async () => {
    // User with 50 credits, needs 100
    await expect(
      CreditService.deductCreditsForBatch(userId, 100, 'Test', 'Test')
    ).rejects.toThrow(InsufficientCreditsError);
  });

  it('prevents overdraw with concurrent requests', async () => {
    // User with 100 credits, two simultaneous 80-credit requests
    const promises = [
      CreditService.deductCreditsForBatch(userId, 80, 'Batch 1', 'Test'),
      CreditService.deductCreditsForBatch(userId, 80, 'Batch 2', 'Test')
    ];

    const results = await Promise.allSettled(promises);
    const succeeded = results.filter(r => r.status === 'fulfilled');
    const failed = results.filter(r => r.status === 'rejected');

    expect(succeeded.length).toBe(1);
    expect(failed.length).toBe(1);
  });
});
```

### Integration Tests

**File:** `app/api/batch/upload/route.test.ts`

```typescript
describe('POST /api/batch/upload', () => {
  it('rejects batch upload with insufficient credits', async () => {
    // User with 10 credits
    const response = await POST(req({ csvRows: 50 }));
    expect(response.status).toBe(402);
    expect(response.body.creditsRequired).toBe(50);
    expect(response.body.creditsAvailable).toBe(10);
  });

  it('deducts credits and creates batch when sufficient', async () => {
    // User with 100 credits
    const response = await POST(req({ csvRows: 50 }));
    expect(response.status).toBe(200);

    const balance = await CreditService.getUserCredits(userId);
    expect(balance).toBe(50);
  });

  it('allows admin to create batch without credits', async () => {
    // Admin user with 0 credits
    const response = await POST(req({ csvRows: 500, role: 'ADMIN' }));
    expect(response.status).toBe(200);

    const balance = await CreditService.getUserCredits(adminId);
    expect(balance).toBe(0); // No deduction for admin
  });

  it('enforces rate limit of 10 uploads per hour', async () => {
    for (let i = 0; i < 10; i++) {
      await POST(req({ csvRows: 1 }));
    }

    const response = await POST(req({ csvRows: 1 }));
    expect(response.status).toBe(429);
  });
});
```

### Edge Case Tests

| Test Case | Expected Result |
|-----------|----------------|
| User with 499 credits uploads 500-row CSV | Rejected with 402 |
| User with 500 credits uploads 500-row CSV | Success, balance = 0 |
| User with 0 credits tries any batch operation | Rejected with 402 |
| Transaction timeout (>10s) | Rejected with 500, no credits deducted |
| Database constraint violation (negative balance) | Rejected, transaction rolled back |

### Manual Testing Checklist

1. ✅ Create test user with 10 credits
2. ✅ Upload 5-row CSV → Success, balance = 5
3. ✅ Upload 10-row CSV → Rejected (402)
4. ✅ Upload 5-row CSV → Success, balance = 0
5. ✅ Try upload with 0 credits → Rejected (402)
6. ✅ Grant 1000 credits via admin
7. ✅ Request batch translation (500 thumbnails, 3 languages) → Deducts 1500 credits
8. ✅ Verify credit_transactions table has correct entries
9. ✅ Verify no users have negative balances
10. ✅ Test concurrent uploads from same user → One succeeds, others rejected

---

## 7. Monitoring & Verification

### Post-Deployment Queries

**Check for negative balances (should return 0):**
```sql
SELECT COUNT(*) FROM users WHERE credits < 0;
```

**Verify all new batches have credits tracked:**
```sql
SELECT COUNT(*)
FROM batch_jobs
WHERE credits_deducted IS NULL
  AND createdAt > '2026-04-25';
```

**Reconciliation check (should return 0 rows):**
```sql
SELECT
  bj.id,
  bj.name,
  bj.totalJobs,
  bj.credits_deducted,
  ct.amount
FROM batch_jobs bj
LEFT JOIN credit_transactions ct ON ct.related_batch_id = bj.id
WHERE bj.credits_deducted != ct.amount
  AND bj.createdAt > '2026-04-25';
```

**Find users with pending batches but 0 credits (should return 0):**
```sql
SELECT u.email, COUNT(bj.id) as pending_batches
FROM users u
LEFT JOIN batch_jobs bj ON bj.userId = u.id AND bj.status = 'PENDING'
WHERE u.credits = 0
GROUP BY u.id
HAVING COUNT(bj.id) > 0;
```

### Audit Logging

All credit deductions logged to `credit_transactions` table:

```typescript
{
  id: 'cm...',
  user_id: 'cm...',
  transaction_type: 'deduct',
  amount: 500,
  balance_before: 1000,
  balance_after: 500,
  reason: 'Batch upload: Marketing Campaign (500 thumbnails)',
  related_batch_id: 'cm...',
  created_at: '2026-04-25T10:30:00Z'
}
```

---

## 8. Rollout Plan

### Phase 1: Development & Testing (Day 1)
1. Implement `deductCreditsForBatch()` in `lib/credit-service.ts`
2. Add credit validation to `/api/batch/upload` and `/api/batch/translate`
3. Add `credits_deducted` field to schema and migrate
4. Write unit tests and integration tests
5. Run tests locally, verify all pass

### Phase 2: Staging Deployment (Day 2)
1. Deploy to staging environment
2. Run full integration test suite
3. Manual testing with test users
4. Monitor logs for errors
5. Verify credit reconciliation queries

### Phase 3: Production Deployment (Day 3)
1. Deploy during low-traffic window (early morning)
2. Monitor error logs for 1 hour
3. Run verification queries (negative balances, reconciliation)
4. Test with real user account (admin creates batch)
5. Monitor for 24 hours, check for anomalies

### Phase 4: Backfill (Optional, Day 4)
1. Backfill `credits_deducted` for existing batches
2. Verify historical data integrity
3. Archive old audit logs

---

## 9. Known Limitations

These are intentional design decisions, not bugs:

1. **No Refunds on Failure** - Credits deducted even if generation fails (prevents refund farming exploits)
2. **Admin Bypass** - Admins can create unlimited batches without credit deduction (intentional for testing/support)
3. **No Partial Batch Credits** - Must deduct full batch cost upfront (prevents race conditions and simplifies implementation)
4. **No Credit Reservations** - Simple deduct-once model (reservation system adds unnecessary complexity)
5. **No Frontend Warnings** - Users don't see credit requirements before upload (can add later as UX improvement)

---

## 10. Success Criteria

This implementation is successful when:

✅ Users with insufficient credits cannot create batch jobs
✅ No users have negative credit balances
✅ All batch credit deductions are logged to `credit_transactions`
✅ Concurrent batch uploads don't cause overdraw
✅ Rate limiting prevents spam attacks
✅ Admin users can still create batches without credit deduction
✅ All unit and integration tests pass
✅ Verification queries return expected results (0 negative balances, 0 reconciliation mismatches)

---

## 11. Files Modified

| File | Changes | Lines |
|------|---------|-------|
| `prisma/schema.prisma` | Add `credits_deducted Int?` to batch_jobs | +1 |
| `lib/credit-service.ts` | Add `deductCreditsForBatch()` function | +80 |
| `app/api/batch/upload/route.ts` | Add validation, rate limiting, atomic deduction | +30 |
| `app/api/batch/translate/route.ts` | Add validation, rate limiting, deduction | +25 |
| **Total** | | **~136** |

---

## 12. Future Enhancements (Out of Scope)

Potential improvements for future iterations:

- Frontend credit balance display on batch upload page
- User-facing confirmation dialogs showing credit cost
- Daily/weekly batch quotas per user tier
- Refund mechanism for system errors (requires categorizing failure types)
- Credit reservation system for long-running batches
- Real-time anomaly detection and admin alerts
- Automated reconciliation reports
- Batch size optimizer (suggest splitting large batches)

These are not security vulnerabilities - they're UX/operational improvements that can be prioritized later.
