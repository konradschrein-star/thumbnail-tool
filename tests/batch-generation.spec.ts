import { test, expect } from '@playwright/test';
import path from 'path';

// Test data from database (Gary Guides You channel with linked archetype)
const TEST_CHANNEL_ID = 'cmms4ixmf0000pt5ohqtgfqce';
const TEST_ARCHETYPE_ID = 'cmmsgq3gw0007dq6s08mpi8gh'; // Tutorial #4

// Test user credentials (from lib/auth.ts)
const TEST_EMAIL = 'test@test.ai';
const TEST_PASSWORD = 'test';

test.describe('Batch Generation System - End-to-End Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Listen to console logs for debugging
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.log(`[BROWSER ERROR] ${msg.text()}`);
      }
    });

    // Listen to page errors
    page.on('pageerror', (error) => {
      console.log(`[PAGE ERROR] ${error.message}`);
    });

    // Navigate to home page
    await page.goto('/');

    // Wait for page to fully load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000); // Extra wait for animations

    // Check if login form is present (by checking for email input)
    const emailInput = page.locator('input[type="email"]');
    const isLoginPage = await emailInput.isVisible({ timeout: 3000 }).catch(() => false);

    if (isLoginPage) {
      console.log('[SETUP] Login page detected - logging in...');

      // Fill credentials
      await page.fill('input[type="email"]', TEST_EMAIL);
      await page.fill('input[type="password"]', TEST_PASSWORD);
      console.log('[SETUP] Filled credentials');

      // Click login button (works with both login page designs)
      const submitButton = page.locator('button[type="submit"]').first();
      await submitButton.click();
      console.log('[SETUP] Clicked login button');

      // Wait for redirect to dashboard
      await page.waitForURL('**/dashboard', { timeout: 15000 });
      console.log('[SETUP] ✓ Logged in successfully\n');
    } else {
      console.log('[SETUP] No login required, proceeding\n');
    }
  });

  test('1. Single Thumbnail Generation (Critical Baseline)', async ({ page }) => {
    test.setTimeout(180000); // 3 minutes for generation + navigation
    console.log('=== TEST 1: Single Thumbnail Generation ===\n');

    // Step 1: Navigate to Generate tab
    await page.goto('/dashboard?tab=generate');
    await page.waitForLoadState('networkidle');
    console.log('✓ Navigated to Generate tab');

    // Take screenshot before filling form
    await page.screenshot({ path: 'test-results/01-generate-tab.png', fullPage: true });

    // Step 3: Fill generation form
    console.log('Filling generation form...');

    // Wait for form to load
    await page.waitForSelector('select[title="Select Channel"]', { timeout: 10000 });

    // Select channel
    await page.selectOption('select[title="Select Channel"]', TEST_CHANNEL_ID);
    console.log(`✓ Selected channel: ${TEST_CHANNEL_ID}`);

    // Wait for archetypes to load
    await page.waitForTimeout(1000);

    // Select archetype
    await page.selectOption('select[title="Select Archetype"]', TEST_ARCHETYPE_ID);
    console.log(`✓ Selected archetype: ${TEST_ARCHETYPE_ID}`);

    // Fill video topic - using placeholder as unique identifier
    const videoTopicInput = page.locator('input[placeholder*="How to build"]');
    await videoTopicInput.fill('Playwright Test - How to Master TypeScript');
    console.log('✓ Filled video topic');

    // Fill thumbnail text - using maxlength or placeholder
    const thumbnailTextInput = page.locator('input[maxlength="50"]');
    await thumbnailTextInput.fill('MASTER TYPESCRIPT');
    console.log('✓ Filled thumbnail text');

    // Take screenshot of filled form
    await page.screenshot({ path: 'test-results/02-form-filled.png', fullPage: true });

    // Step 4: Click Generate button
    // Scroll to button and wait for it to be enabled
    const generateButton = page.locator('button[type="submit"]').filter({ hasText: /generate/i });
    await generateButton.scrollIntoViewIfNeeded();
    await expect(generateButton).toBeEnabled();
    console.log('Clicking Generate button...');
    await generateButton.click();
    await page.waitForTimeout(2000); // Wait for form submission

    // Step 5: Wait for generation to complete
    console.log('Waiting for generation to complete (this may take 50+ seconds)...');

    // Check if it's async (queued) or sync (blocking)
    const queuedMessage = page.getByText(/queued|pending/i);
    const isAsync = await queuedMessage.isVisible({ timeout: 5000 }).catch(() => false);

    if (isAsync) {
      console.log('✓ Async mode detected - job queued');

      // Navigate to History tab to check status
      await page.goto('/dashboard?tab=history');
      await page.waitForLoadState('networkidle');

      // Wait for job to appear and complete (poll every 5 seconds, max 2 minutes)
      let completed = false;
      const maxAttempts = 24; // 24 * 5s = 2 minutes

      for (let i = 0; i < maxAttempts; i++) {
        await page.waitForTimeout(5000);
        await page.reload();
        await page.waitForLoadState('networkidle');

        const completedBadge = page.getByText(/completed/i).first();
        if (await completedBadge.isVisible().catch(() => false)) {
          completed = true;
          console.log(`✓ Job completed after ${(i + 1) * 5} seconds`);
          break;
        }

        console.log(`Waiting... (${(i + 1) * 5}s elapsed)`);
      }

      expect(completed, 'Job should complete within 2 minutes').toBe(true);
    } else {
      console.log('✓ Sync mode detected - waiting for completion...');

      // Wait for success heading in the result container
      await expect(page.locator('.success-container h3').filter({ hasText: 'Success' })).toBeVisible({ timeout: 120000 });
      console.log('✓ Generation completed');
    }

    // Step 6: Verify image appears in History
    await page.goto('/dashboard?tab=history');
    await page.waitForLoadState('networkidle');

    // Take screenshot of history
    await page.screenshot({ path: 'test-results/03-history-after-generation.png', fullPage: true });

    // Check for the generated thumbnail
    const thumbnailImage = page.locator('img[alt*="Thumbnail"], img[alt*="preview"]').first();
    await expect(thumbnailImage).toBeVisible({ timeout: 5000 });
    console.log('✓ Thumbnail image visible in history');

    // Check for completed status badge
    const completedBadge = page.getByText(/completed/i).first();
    await expect(completedBadge).toBeVisible();
    console.log('✓ Job status shows "completed"');

    // Step 7: Try to view/download the image
    const viewButton = page.getByRole('button', { name: /view|preview/i }).first();
    if (await viewButton.isVisible().catch(() => false)) {
      await viewButton.click();
      await page.waitForTimeout(1000);

      // Check if modal opened with image
      const modalImage = page.locator('img[src*="/generated/"], img[src*="http"]').last();
      await expect(modalImage).toBeVisible({ timeout: 5000 });
      console.log('✓ Preview modal opened with image');

      // Take screenshot of preview
      await page.screenshot({ path: 'test-results/04-image-preview.png', fullPage: true });

      // Get the image URL
      const imageUrl = await modalImage.getAttribute('src');
      console.log(`✓ Image URL: ${imageUrl}`);

      // Download the image for quality review
      if (imageUrl) {
        const response = await page.request.get(imageUrl);
        const buffer = await response.body();
        const fs = await import('fs');
        fs.writeFileSync('test-results/generated-thumbnail-1.png', buffer);
        console.log('✓ Downloaded image to test-results/generated-thumbnail-1.png');
      }
    }

    console.log('\n=== TEST 1 PASSED ✓ ===\n');
  });

  test('2. Manual CSV Batch Upload', async ({ page }) => {
    console.log('\n=== TEST 2: Manual CSV Batch Upload ===\n');

    // Create a test CSV file
    const csvContent = `channelId,archetypeId,videoTopic,thumbnailText,customPrompt
${TEST_CHANNEL_ID},${TEST_ARCHETYPE_ID},React Tutorial for Beginners,REACT BASICS,
${TEST_CHANNEL_ID},${TEST_ARCHETYPE_ID},Advanced Python Tips,PYTHON PRO,Add bright colors
${TEST_CHANNEL_ID},${TEST_ARCHETYPE_ID},JavaScript ES2024 Features,JS 2024,Modern style`;

    const fs = await import('fs');
    const csvPath = path.join(process.cwd(), 'test-results', 'test-batch.csv');
    fs.writeFileSync(csvPath, csvContent);
    console.log('✓ Created test CSV file');

    // Login if needed
    const loginButton = page.getByRole('button', { name: /sign in|login/i });
    if (await loginButton.isVisible().catch(() => false)) {
      await page.fill('input[type="email"]', ADMIN_EMAIL);
      await page.fill('input[type="password"]', ADMIN_PASSWORD);
      await loginButton.click();
      await page.waitForURL('**/dashboard', { timeout: 10000 });
    }

    // Navigate to Bulk Generation > Manual Upload
    await page.goto('/bulk');
    await page.waitForLoadState('networkidle');

    const manualUploadTab = page.getByText(/manual upload/i);
    await manualUploadTab.click();
    await page.waitForTimeout(1000);

    console.log('✓ Navigated to Manual Upload tab');
    await page.screenshot({ path: 'test-results/05-manual-upload-tab.png', fullPage: true });

    // Upload CSV file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(csvPath);
    console.log('✓ Selected CSV file');

    // Fill batch name
    const batchNameInput = page.locator('input[name="batchName"], input[placeholder*="name"]');
    await batchNameInput.fill('Playwright Test Batch');
    console.log('✓ Filled batch name');

    await page.screenshot({ path: 'test-results/06-csv-uploaded.png', fullPage: true });

    // Click Upload/Submit button
    const uploadButton = page.getByRole('button', { name: /upload|submit|create batch/i });
    await uploadButton.click();
    console.log('Clicked upload button - waiting for batch creation...');

    // Wait for success message
    await expect(page.getByText(/success|queued|created/i)).toBeVisible({ timeout: 10000 });
    console.log('✓ Batch created successfully');

    // Navigate to Batch History
    await page.goto('/bulk?tab=history');
    await page.waitForLoadState('networkidle');

    // Wait for batch to appear
    const batchRow = page.getByText('Playwright Test Batch');
    await expect(batchRow).toBeVisible({ timeout: 5000 });
    console.log('✓ Batch appears in history');

    await page.screenshot({ path: 'test-results/07-batch-history.png', fullPage: true });

    // Monitor batch progress (poll every 10 seconds, max 5 minutes)
    let completed = false;
    const maxAttempts = 30; // 30 * 10s = 5 minutes

    for (let i = 0; i < maxAttempts; i++) {
      await page.waitForTimeout(10000);
      await page.reload();
      await page.waitForLoadState('networkidle');

      const completedStatus = page.getByText(/completed/i);
      if (await completedStatus.isVisible().catch(() => false)) {
        completed = true;
        console.log(`✓ Batch completed after ${(i + 1) * 10} seconds`);
        break;
      }

      console.log(`Batch processing... (${(i + 1) * 10}s elapsed)`);
    }

    expect(completed, 'Batch should complete within 5 minutes').toBe(true);

    // Click on batch to view details
    await batchRow.click();
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'test-results/08-batch-details.png', fullPage: true });

    // Verify all 3 thumbnails were generated
    const thumbnails = page.locator('img[alt*="Thumbnail"], img[src*="/generated/"]');
    const count = await thumbnails.count();
    expect(count).toBeGreaterThanOrEqual(3);
    console.log(`✓ Found ${count} generated thumbnails`);

    console.log('\n=== TEST 2 PASSED ✓ ===\n');
  });
});
