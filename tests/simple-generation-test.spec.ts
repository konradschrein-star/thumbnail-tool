import { test, expect } from '@playwright/test';
import { writeFileSync } from 'fs';
import { join } from 'path';

test.describe('Simple Generation Test', () => {
  const API_CALLS: Array<{ url: string; method: string; status: number; response?: any; timestamp: number }> = [];

  async function loginAsAdmin(page: any) {
    await page.goto('https://thumbnails.schreinercontentsystems.com/auth/signin');
    await page.waitForLoadState('networkidle');

    const emailInput = page.locator('input').first();
    await emailInput.fill('konrad.schrein@gmail.com');

    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.fill('testva1234');

    const submitButton = page.locator('button').first();
    await submitButton.click();

    await page.waitForURL('**/dashboard', { timeout: 15000 });
    console.log('✓ Logged in as admin');
  }

  function setupAPIMonitoring(page: any) {
    page.on('response', async (response: any) => {
      if (response.url().includes('/api/')) {
        const call = {
          url: response.url(),
          method: response.request().method(),
          status: response.status(),
          response: undefined as any,
          timestamp: Date.now()
        };

        try {
          if (response.status() < 400 && response.status() >= 200) {
            const contentType = response.headers()['content-type'];
            if (contentType?.includes('application/json')) {
              call.response = await response.json().catch(() => null);
            }
          }
        } catch (e) {
          // Ignore
        }

        API_CALLS.push(call);
        const endpoint = call.url.split('/api/')[1]?.split('?')[0] || 'unknown';
        console.log(`   📡 ${call.method} /api/${endpoint} → ${call.status}`);
      }
    });
  }

  test('Batch Generation - Full Flow', async ({ page }) => {
    console.log('\n🚀 Starting Batch Generation Test...\n');

    setupAPIMonitoring(page);
    await loginAsAdmin(page);

    // Navigate to bulk page
    console.log('\n📦 Navigating to bulk generation...');
    await page.goto('https://thumbnails.schreinercontentsystems.com/bulk');
    await page.waitForLoadState('networkidle');

    // Get first available channel and archetype
    console.log('\n🔍 Fetching available channels and archetypes...');

    const channelsResponse = await page.request.get('https://thumbnails.schreinercontentsystems.com/api/channels');
    const channelsData = await channelsResponse.json();

    // Handle different response formats
    const channels = Array.isArray(channelsData) ? channelsData : (channelsData?.channels || []);
    console.log(`   Found ${channels.length} channels`);

    if (channels.length === 0) {
      throw new Error(`No channels available. Response: ${JSON.stringify(channelsData).substring(0, 500)}`);
    }

    const channelId = channels[0].id;
    const channelName = channels[0].name;
    console.log(`   Using channel: ${channelName} (${channelId})`);

    const archetypesResponse = await page.request.get(`https://thumbnails.schreinercontentsystems.com/api/archetypes?channelId=${channelId}`);
    const archetypesData = await archetypesResponse.json();
    const archetypes = Array.isArray(archetypesData) ? archetypesData : (archetypesData?.archetypes || []);
    console.log(`   Found ${archetypes.length} archetypes for this channel`);

    if (archetypes.length === 0) {
      console.log('Archetypes response:', JSON.stringify(archetypesData).substring(0, 300));
      throw new Error(`No archetypes available for channel ${channelId}`);
    }

    const archetypeId = archetypes[0].id;
    const archetypeName = archetypes[0].name;
    console.log(`   Using archetype: ${archetypeName} (${archetypeId})`);

    // Create test CSV
    const csvContent = `channelId,archetypeId,videoTopic,thumbnailText
${channelId},${archetypeId},Playwright Batch Test 1,BATCH TEST 1
${channelId},${archetypeId},Playwright Batch Test 2,BATCH TEST 2`;

    const csvPath = join(process.cwd(), 'playwright-batch-test.csv');
    writeFileSync(csvPath, csvContent);
    console.log(`\n✓ Created test CSV: ${csvPath}`);

    // Click Manual Upload tab
    console.log('\n📤 Opening Manual Upload...');
    const manualUploadButton = page.locator('button:has-text("Manual Upload")').first();
    await manualUploadButton.click();
    console.log('   ✓ Clicked Manual Upload tab');

    await page.waitForTimeout(1000);

    // Upload file first (batch name input appears after file upload)
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(csvPath);
    console.log('   ✓ File uploaded, waiting for preview...');

    await page.waitForTimeout(2000);

    // Now fill batch name (appears only after file is uploaded)
    const batchNameInput = page.locator('input.input[type="text"]').first();
    const batchName = 'Playwright Test ' + Date.now();
    await batchNameInput.fill(batchName);
    console.log(`   ✓ Batch name filled: ${batchName}`);

    // Click upload button
    const uploadButton = page.locator('button:has-text("Upload & Queue Batch")').first();
    await uploadButton.click();
    console.log('   ✓ Clicked Upload & Queue Batch button');

    // Wait for response
    console.log('\n⏳ Waiting for API response...');
    await page.waitForTimeout(5000);

    // Check API calls
    const uploadCall = API_CALLS.find(c => c.url.includes('/api/batch/upload'));

    if (uploadCall) {
      console.log('\n✅ BATCH UPLOAD API CALL:');
      console.log(`   Status: ${uploadCall.status}`);
      console.log(`   Response:`, JSON.stringify(uploadCall.response, null, 2));

      expect(uploadCall.status).toBe(200);
      expect(uploadCall.response?.success).toBe(true);
      expect(uploadCall.response?.batchJobId).toBeTruthy();
      expect(uploadCall.response?.jobCount).toBeGreaterThan(0);

      console.log(`\n🎉 SUCCESS! Batch created:`);
      console.log(`   Batch ID: ${uploadCall.response.batchJobId}`);
      console.log(`   Jobs queued: ${uploadCall.response.jobCount}`);
    } else {
      console.log('\n⚠️  No batch upload API call detected');
      console.log('All API calls:', API_CALLS.map(c => `${c.method} ${c.url.split('/api/')[1]}`));
    }

    await page.screenshot({ path: 'test-results/batch-complete.png', fullPage: true });
  });

  test('Single Generation - Dashboard', async ({ page }) => {
    console.log('\n🎨 Starting Single Generation Test...\n');

    setupAPIMonitoring(page);
    await loginAsAdmin(page);

    // Get test data
    const channelsResponse = await page.request.get('https://thumbnails.schreinercontentsystems.com/api/channels');
    const channelsData = await channelsResponse.json();
    const channels = Array.isArray(channelsData) ? channelsData : (channelsData?.channels || []);

    if (channels.length === 0) {
      console.log('Channels response:', JSON.stringify(channelsData));
      throw new Error('No channels available');
    }

    const channelId = channels[0].id;
    console.log(`Using channel: ${channels[0].name}`);

    const archetypesResponse = await page.request.get(`https://thumbnails.schreinercontentsystems.com/api/archetypes?channelId=${channelId}`);
    const archetypesData = await archetypesResponse.json();
    const archetypes = Array.isArray(archetypesData) ? archetypesData : (archetypesData?.archetypes || []);

    if (archetypes.length === 0) {
      console.log('Archetypes response:', JSON.stringify(archetypesData));
      throw new Error('No archetypes available');
    }

    const archetypeId = archetypes[0].id;
    console.log(`Using archetype: ${archetypes[0].name}`);

    // Navigate to dashboard
    console.log('\n📋 Navigating to dashboard...');
    await page.goto('https://thumbnails.schreinercontentsystems.com/dashboard');
    await page.waitForLoadState('networkidle');

    // Navigate to generate tab
    console.log('\n📝 Navigating to generate tab...');
    await page.goto('https://thumbnails.schreinercontentsystems.com/dashboard?tab=generate');
    await page.waitForLoadState('networkidle');
    console.log('   ✓ On generate tab');

    await page.waitForTimeout(2000);

    // Fill generation form with specific selectors
    console.log('\n📝 Filling generation form...');

    // Select channel using specific title attribute
    const channelSelect = page.locator('select[title="Select Channel"]').first();
    await channelSelect.selectOption(channelId);
    console.log('   ✓ Selected channel');

    await page.waitForTimeout(1000);

    // Select archetype using specific title attribute
    const archetypeSelect = page.locator('select[title="Select Archetype"]').first();
    await archetypeSelect.selectOption(archetypeId);
    console.log('   ✓ Selected archetype');

    await page.waitForTimeout(1000);

    // Fill video topic and thumbnail text using labels
    const videoTopicInput = page.locator('input[type="text"]').first();
    await videoTopicInput.fill('Playwright Single Test');
    console.log('   ✓ Filled video topic');

    const thumbnailTextInput = page.locator('input[type="text"]').nth(1);
    await thumbnailTextInput.fill('TEST');
    console.log('   ✓ Filled thumbnail text');

    // Click generate button
    const generateButton = page.locator('button:has-text("Generate")').first();
    await generateButton.click();
    console.log('\n🎨 Generation queued...');

    // Wait briefly for navigation to history
    console.log('⏳ Waiting for redirect to history...\n');
    await page.waitForURL('**/dashboard?tab=history', { timeout: 5000 });
    console.log('   ✓ Redirected to history page');

    // Check result - should be queued, not completed
    const generateCall = API_CALLS.find(c => c.url.includes('/api/generate') && c.method === 'POST');

    if (generateCall) {
      console.log('\n✅ GENERATION API CALL:');
      console.log(`   Status: ${generateCall.status}`);
      console.log(`   Response:`, JSON.stringify(generateCall.response, null, 2));

      expect(generateCall.status).toBe(200);
      expect(generateCall.response?.success).toBe(true);
      expect(generateCall.response?.jobIds).toBeTruthy();
      expect(generateCall.response?.jobIds.length).toBeGreaterThan(0);

      console.log(`\n🎉 SUCCESS! Jobs queued:`);
      console.log(`   Job IDs: ${generateCall.response.jobIds.join(', ')}`);
      console.log(`   Message: ${generateCall.response.message}`);
    } else {
      console.log('\n⚠️  No generation API call detected');
      console.log('All API calls:', API_CALLS.map(c => `${c.method} ${c.url.split('/api/')[1]}`));
    }

    await page.screenshot({ path: 'test-results/single-complete.png', fullPage: true });
  });

  test.afterEach(() => {
    if (API_CALLS.length > 0) {
      console.log('\n\n📊 API SUMMARY:');
      console.log('='.repeat(70));

      API_CALLS.forEach(call => {
        const endpoint = call.url.split('/api/')[1]?.split('?')[0];
        console.log(`${call.method.padEnd(6)} /api/${endpoint.padEnd(30)} → ${call.status}`);
      });
    }
  });
});
