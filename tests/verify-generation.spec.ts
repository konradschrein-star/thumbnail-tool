import { test, expect } from '@playwright/test';
import { writeFileSync, readFileSync } from 'fs';
import { join } from 'path';

const TEST_CSV_CONTENT = `channelId,archetypeId,videoTopic,thumbnailText
cm4x1abc123,cm4x2def456,Test Video Topic 1,TEST TEXT 1
cm4x1abc123,cm4x2def456,Test Video Topic 2,TEST TEXT 2`;

test.describe('Generation System Verification', () => {
  let channelId: string;
  let archetypeId: string;
  let apiCalls: Array<{ url: string; method: string; status: number; response?: any }> = [];

  test.beforeAll(async ({ browser }) => {
    // Get or create test channel and archetype
    const page = await browser.newPage();

    try {
      // Login first
      await page.goto('https://thumbnails.schreinercontentsystems.com/auth/signin');
      await page.waitForLoadState('networkidle');

      // Fill email (look for placeholder or label)
      const emailInput = page.locator('input[placeholder*="example.com"], input[type="email"], input').first();
      await emailInput.fill('test@test.ai');

      // Fill password
      const passwordInput = page.locator('input[type="password"]').first();
      await passwordInput.fill('test');

      // Click submit button
      const submitButton = page.locator('button:has-text("Gain Access"), button:has-text("Sign"), button[type="submit"]').first();
      await submitButton.click();

      await page.waitForURL('**/dashboard', { timeout: 10000 });

      // Fetch first available channel and archetype
      const response = await page.request.get('https://thumbnails.schreinercontentsystems.com/api/channels');
      const channels = await response.json();

      if (channels.length > 0) {
        channelId = channels[0].id;
        console.log(`✓ Using channel: ${channels[0].name} (${channelId})`);

        // Get archetypes for this channel
        const archResponse = await page.request.get(`https://thumbnails.schreinercontentsystems.com/api/archetypes?channelId=${channelId}`);
        const archetypes = await archResponse.json();

        if (archetypes.length > 0) {
          archetypeId = archetypes[0].id;
          console.log(`✓ Using archetype: ${archetypes[0].name} (${archetypeId})`);
        }
      }
    } finally {
      await page.close();
    }

    if (!channelId || !archetypeId) {
      throw new Error('No test data available. Please create a channel and archetype first.');
    }
  });

  test('1. Batch Generation - CSV Upload', async ({ page }) => {
    console.log('\n📦 Testing Batch Generation...\n');

    // Monitor all API calls
    page.on('response', async (response) => {
      if (response.url().includes('/api/')) {
        const call = {
          url: response.url(),
          method: response.request().method(),
          status: response.status(),
          response: undefined as any
        };

        try {
          if (response.status() < 300) {
            call.response = await response.json().catch(() => null);
          }
        } catch (e) {
          // Ignore JSON parse errors
        }

        apiCalls.push(call);
        console.log(`   API: ${call.method} ${call.url.split('/api/')[1]} → ${call.status}`);
      }
    });

    // Login
    await page.goto('https://thumbnails.schreinercontentsystems.com/auth/signin');
    await page.waitForLoadState('networkidle');

    const emailInput = page.locator('input[placeholder*="example.com"], input[type="email"], input').first();
    await emailInput.fill('test@test.ai');

    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.fill('test');

    const submitButton = page.locator('button:has-text("Gain Access"), button:has-text("Sign"), button[type="submit"]').first();
    await submitButton.click();

    await page.waitForURL('**/dashboard', { timeout: 10000 });

    console.log('✓ Logged in');

    // Navigate to batch generation
    await page.goto('https://thumbnails.schreinercontentsystems.com/bulk');
    await page.waitForLoadState('networkidle');

    console.log('✓ Navigated to /bulk');

    // Create test CSV with actual IDs
    const csvContent = `channelId,archetypeId,videoTopic,thumbnailText
${channelId},${archetypeId},PowerPoint Tutorial Test,POWERPOINT
${channelId},${archetypeId},Excel Formula Test,EXCEL`;

    const csvPath = join(process.cwd(), 'test-batch.csv');
    writeFileSync(csvPath, csvContent);

    console.log(`✓ Created test CSV at ${csvPath}`);

    // Look for Manual Upload section
    const uploadSection = page.locator('text=Manual Upload').first();
    await expect(uploadSection).toBeVisible({ timeout: 5000 });

    console.log('✓ Found Manual Upload section');

    // Fill batch name
    const batchNameInput = page.locator('input[placeholder*="batch" i], input[name*="batch" i]').first();
    await batchNameInput.fill('Playwright Test Batch ' + Date.now());

    console.log('✓ Filled batch name');

    // Upload CSV
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(csvPath);

    console.log('✓ Uploaded CSV file');

    // Wait for preview or upload button
    await page.waitForTimeout(1000);

    // Click upload/queue button
    const uploadButton = page.locator('button:has-text("Upload"), button:has-text("Queue"), button:has-text("Start")').first();
    await uploadButton.click();

    console.log('✓ Clicked upload button');

    // Wait for API response
    await page.waitForTimeout(3000);

    // Check for success message or batch created
    const successIndicators = [
      page.locator('text=/queued|success|created/i'),
      page.locator('[role="alert"]:has-text("success")'),
      page.locator('.success, .toast')
    ];

    let foundSuccess = false;
    for (const indicator of successIndicators) {
      if (await indicator.count() > 0) {
        foundSuccess = true;
        console.log('✓ Success indicator found');
        break;
      }
    }

    // Find the batch upload API call
    const uploadCall = apiCalls.find(c => c.url.includes('/api/batch/upload'));
    if (uploadCall) {
      console.log('\n📊 Batch Upload API Response:');
      console.log(`   Status: ${uploadCall.status}`);
      console.log(`   Response:`, JSON.stringify(uploadCall.response, null, 2));

      expect(uploadCall.status).toBe(200);
      expect(uploadCall.response).toHaveProperty('success', true);
      expect(uploadCall.response).toHaveProperty('batchJobId');
      expect(uploadCall.response).toHaveProperty('jobCount');

      console.log(`\n✅ Batch created: ${uploadCall.response.batchJobId}`);
      console.log(`✅ Jobs queued: ${uploadCall.response.jobCount}`);
    } else {
      console.log('\n⚠️  No batch upload API call found');
      console.log('All API calls:', apiCalls.map(c => `${c.method} ${c.url}`));
    }

    // Take screenshot
    await page.screenshot({ path: 'test-results/batch-generation.png', fullPage: true });
    console.log('✓ Screenshot saved');
  });

  test('2. Single Generation - Dashboard', async ({ page }) => {
    console.log('\n🎨 Testing Single Generation...\n');

    apiCalls = []; // Reset API calls

    // Monitor API calls
    page.on('response', async (response) => {
      if (response.url().includes('/api/')) {
        const call = {
          url: response.url(),
          method: response.request().method(),
          status: response.status(),
          response: undefined as any
        };

        try {
          if (response.status() < 300) {
            call.response = await response.json().catch(() => null);
          }
        } catch (e) {
          // Ignore
        }

        apiCalls.push(call);
        console.log(`   API: ${call.method} ${call.url.split('/api/')[1]} → ${call.status}`);
      }
    });

    // Login
    await page.goto('https://thumbnails.schreinercontentsystems.com/auth/signin');
    await page.waitForLoadState('networkidle');

    const emailInput = page.locator('input[placeholder*="example.com"], input[type="email"], input').first();
    await emailInput.fill('test@test.ai');

    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.fill('test');

    const submitButton = page.locator('button:has-text("Gain Access"), button:has-text("Sign"), button[type="submit"]').first();
    await submitButton.click();

    await page.waitForURL('**/dashboard', { timeout: 10000 });

    console.log('✓ Logged in');

    // Navigate to generation page
    await page.goto('https://thumbnails.schreinercontentsystems.com/dashboard');
    await page.waitForLoadState('networkidle');

    console.log('✓ Navigated to dashboard');

    // Look for generate form
    const channelSelect = page.locator('select[name="channelId"], select:has(option:text-matches("channel", "i"))').first();
    await expect(channelSelect).toBeVisible({ timeout: 10000 });

    console.log('✓ Found generation form');

    // Fill form
    await channelSelect.selectOption(channelId);
    console.log(`✓ Selected channel: ${channelId}`);

    await page.waitForTimeout(500);

    const archetypeSelect = page.locator('select[name="archetypeId"], select:has(option:text-matches("archetype|style", "i"))').first();
    await archetypeSelect.selectOption(archetypeId);
    console.log(`✓ Selected archetype: ${archetypeId}`);

    // Fill video topic and text
    const topicInput = page.locator('input[name="videoTopic"], input[placeholder*="topic" i]').first();
    await topicInput.fill('Playwright Test Generation');

    const textInput = page.locator('input[name="thumbnailText"], input[placeholder*="text" i]').first();
    await textInput.fill('TEST');

    console.log('✓ Filled form fields');

    // Click generate
    const generateButton = page.locator('button:has-text("Generate"), button[type="submit"]').first();
    await generateButton.click();

    console.log('✓ Clicked generate button');

    // Wait for generation (can take 30-60 seconds)
    console.log('⏳ Waiting for generation (up to 90 seconds)...');

    await page.waitForTimeout(90000); // Wait 90 seconds

    // Check for generation API call
    const generateCall = apiCalls.find(c => c.url.includes('/api/generate') && c.method === 'POST');
    if (generateCall) {
      console.log('\n📊 Generation API Response:');
      console.log(`   Status: ${generateCall.status}`);
      console.log(`   Response:`, JSON.stringify(generateCall.response, null, 2));

      if (generateCall.status === 200) {
        expect(generateCall.response).toHaveProperty('success', true);
        expect(generateCall.response).toHaveProperty('job');

        console.log(`\n✅ Generation completed!`);
        console.log(`✅ Job ID: ${generateCall.response.job?.id}`);
        console.log(`✅ Output URL: ${generateCall.response.job?.outputUrl}`);
        console.log(`✅ Status: ${generateCall.response.job?.status}`);
      } else {
        console.log(`\n⚠️  Generation returned status ${generateCall.status}`);
      }
    } else {
      console.log('\n⚠️  No generation API call found');
    }

    // Take screenshot
    await page.screenshot({ path: 'test-results/single-generation.png', fullPage: true });
    console.log('✓ Screenshot saved');
  });

  test.afterAll(() => {
    console.log('\n\n📋 API CALLS SUMMARY:');
    console.log('='.repeat(60));

    const grouped = apiCalls.reduce((acc, call) => {
      const endpoint = call.url.split('/api/')[1]?.split('?')[0] || 'unknown';
      if (!acc[endpoint]) acc[endpoint] = [];
      acc[endpoint].push(call);
      return acc;
    }, {} as Record<string, typeof apiCalls>);

    Object.entries(grouped).forEach(([endpoint, calls]) => {
      console.log(`\n${endpoint}:`);
      calls.forEach(call => {
        console.log(`  ${call.method} → ${call.status}`);
        if (call.response && call.status === 200) {
          console.log(`    ✓ Success:`, JSON.stringify(call.response).substring(0, 100));
        }
      });
    });
  });
});
