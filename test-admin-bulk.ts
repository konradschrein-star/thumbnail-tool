/**
 * Playwright test for Admin Panel and Bulk Generation
 */
import { chromium } from 'playwright';

async function testAdminAndBulk() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  page.on('pageerror', (error) => {
    errors.push(`Page error: ${error.message}`);
  });

  try {
    console.log('🔍 Testing Admin Panel and Bulk Generation\n');

    // ============================================
    // STEP 1: Login
    // ============================================
    console.log('📝 Step 1: Logging in...');
    await page.goto('https://thumbnails.schreinercontentsystems.com', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    await page.waitForTimeout(2000);

    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();

    await emailInput.fill('konrad.schrein@gmail.com');
    await passwordInput.fill('testva1234');

    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();

    await page.waitForTimeout(3000);

    if (page.url().includes('/dashboard')) {
      console.log('✅ Login successful\n');
    } else {
      throw new Error('Login failed - not redirected to dashboard');
    }

    // ============================================
    // STEP 2: Navigate to Admin Panel
    // ============================================
    console.log('📝 Step 2: Navigating to Admin Panel...');
    await page.goto('https://thumbnails.schreinercontentsystems.com/admin', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    await page.waitForTimeout(3000);

    // Wait for tabs to load
    await page.locator('button:has-text("Dashboard")').waitFor({ timeout: 10000 }).catch(() => null);

    const dashboardTab = await page.locator('button:has-text("Dashboard")').isVisible().catch(() => false);
    if (dashboardTab) {
      console.log('✅ Admin panel loaded with tabs\n');
    } else {
      console.log('⚠️  Admin panel tabs not found\n');
    }

    // ============================================
    // STEP 3: Test Dashboard Tab
    // ============================================
    console.log('📝 Step 3: Testing Dashboard Tab...');

    const dashBtn = page.locator('button:has-text("Dashboard")');
    if (await dashBtn.isVisible().catch(() => false)) {
      await dashBtn.click();
      await page.waitForTimeout(2000);
      console.log('  ✓ Clicked Dashboard tab');

      // Look for stats
      const hasStats = await page.locator('text=/total|statistics|users|credits/i').first().isVisible().catch(() => false);
      if (hasStats) {
        console.log('  ✓ Dashboard statistics visible');
      } else {
        console.log('  ⚠️  Dashboard statistics not visible');
      }
    }

    await page.screenshot({ path: 'admin-dashboard-tab.png', fullPage: true });
    console.log('  📸 Screenshot: admin-dashboard-tab.png\n');

    // ============================================
    // STEP 4: Test Users & Credits Tab
    // ============================================
    console.log('📝 Step 4: Testing Users & Credits Tab...');

    const usersBtn = page.locator('button:has-text("Users & Credits")');
    if (await usersBtn.isVisible().catch(() => false)) {
      await usersBtn.click();
      await page.waitForTimeout(2000);
      console.log('  ✓ Clicked Users & Credits tab');

      // Wait for user table to load
      await page.waitForTimeout(2000);

      // Check for user data
      const hasUserData = await page.locator('text=/email|konrad|test@test/i').first().isVisible().catch(() => false);
      if (hasUserData) {
        console.log('  ✓ User list loaded');
      } else {
        console.log('  ⚠️  User list not visible');
      }

      await page.screenshot({ path: 'admin-users-tab.png', fullPage: true });
      console.log('  📸 Screenshot: admin-users-tab.png\n');
    } else {
      console.log('  ⚠️  Users & Credits tab not found\n');
    }

    // ============================================
    // STEP 5: Test Channels Tab
    // ============================================
    console.log('📝 Step 5: Testing Channels Tab...');

    const channelsBtn = page.locator('button:has-text("Channels")');
    if (await channelsBtn.isVisible().catch(() => false)) {
      await channelsBtn.click();
      await page.waitForTimeout(2000);
      console.log('  ✓ Clicked Channels tab');

      // Wait for channel table
      await page.waitForTimeout(2000);

      const hasChannelData = await page.locator('text=/channel|owner/i').first().isVisible().catch(() => false);
      if (hasChannelData) {
        console.log('  ✓ Channel list loaded');
      } else {
        console.log('  ⚠️  Channel list not visible');
      }

      await page.screenshot({ path: 'admin-channels-tab.png', fullPage: true });
      console.log('  📸 Screenshot: admin-channels-tab.png\n');
    } else {
      console.log('  ⚠️  Channels tab not found\n');
    }

    // ============================================
    // STEP 6: Test Jobs & Thumbnails Tab
    // ============================================
    console.log('📝 Step 6: Testing Jobs & Thumbnails Tab...');

    const jobsBtn = page.locator('button:has-text("Jobs & Thumbnails")');
    if (await jobsBtn.isVisible().catch(() => false)) {
      await jobsBtn.click();
      await page.waitForTimeout(2000);
      console.log('  ✓ Clicked Jobs & Thumbnails tab');

      // Wait for job table
      await page.waitForTimeout(2000);

      const hasJobData = await page.locator('text=/status|completed|pending|failed/i').first().isVisible().catch(() => false);
      if (hasJobData) {
        console.log('  ✓ Job list loaded');
      } else {
        console.log('  ⚠️  Job list not visible (might be empty)');
      }

      await page.screenshot({ path: 'admin-jobs-tab.png', fullPage: true });
      console.log('  📸 Screenshot: admin-jobs-tab.png\n');
    } else {
      console.log('  ⚠️  Jobs & Thumbnails tab not found\n');
    }

    // ============================================
    // STEP 7: Test Bulk Generation Page
    // ============================================
    console.log('📝 Step 7: Testing Bulk Generation Page...');

    await page.goto('https://thumbnails.schreinercontentsystems.com/bulk', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    await page.waitForTimeout(3000);

    // Check for bulk page elements
    const bulkTitle = await page.locator('text=/bulk|batch operations|google sheets/i').first().isVisible().catch(() => false);
    if (bulkTitle) {
      console.log('  ✓ Bulk generation page loaded');
    } else {
      console.log('  ⚠️  Bulk generation page not found');
    }

    // Check for Google Sheets connection
    const sheetsSection = await page.locator('text=/google sheets|connect.*sheet/i').first().isVisible().catch(() => false);
    if (sheetsSection) {
      console.log('  ✓ Google Sheets integration visible');
    } else {
      console.log('  ⚠️  Google Sheets integration not found');
    }

    await page.screenshot({ path: 'bulk-generation-page.png', fullPage: true });
    console.log('  📸 Screenshot: bulk-generation-page.png\n');

    // ============================================
    // STEP 8: Summary
    // ============================================
    console.log('📝 Step 8: Error Summary...');

    if (errors.length > 0) {
      console.log('  ⚠️  Console errors detected:');
      errors.slice(0, 5).forEach(err => console.log('    -', err.substring(0, 100)));
      if (errors.length > 5) {
        console.log(`    ... and ${errors.length - 5} more errors`);
      }
    } else {
      console.log('  ✓ No console errors detected');
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(50));
    console.log('✅ All tests completed');
    console.log('📸 Screenshots saved to project root');
    console.log(`⚠️  Total console errors: ${errors.length}`);
    console.log('='.repeat(50) + '\n');

  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: 'test-error.png', fullPage: true });
    console.log('📸 Error screenshot saved to test-error.png');
  } finally {
    await browser.close();
  }
}

testAdminAndBulk();
