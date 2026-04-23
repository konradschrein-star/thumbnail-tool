import { test, expect } from '@playwright/test';

const TEST_EMAIL = 'test@test.ai';
const TEST_PASSWORD = 'test';
const TEST_CHANNEL_ID = 'cmms4ixmf0000pt5ohqtgfqce';
const TEST_ARCHETYPE_ID = 'cmmsgq3gw0007dq6s08mpi8gh';

test('Debug Form Submission', async ({ page }) => {
  test.setTimeout(180000);

  // Login
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  const emailInput = page.locator('input[type="email"]');
  const isLoginPage = await emailInput.isVisible({ timeout: 3000 }).catch(() => false);

  if (isLoginPage) {
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    console.log('✓ Logged in');
  }

  // Navigate to Generate
  await page.goto('/dashboard?tab=generate');
  await page.waitForLoadState('networkidle');
  console.log('✓ On Generate tab');

  // Fill form
  await page.waitForSelector('select[title="Select Channel"]', { timeout: 10000 });
  await page.selectOption('select[title="Select Channel"]', TEST_CHANNEL_ID);
  await page.waitForTimeout(1000);
  await page.selectOption('select[title="Select Archetype"]', TEST_ARCHETYPE_ID);

  const videoTopicInput = page.locator('input[placeholder*="How to build"]');
  await videoTopicInput.fill('Test Generation Debug');

  const thumbnailTextInput = page.locator('input[maxlength="50"]');
  await thumbnailTextInput.fill('DEBUG TEST');

  console.log('✓ Form filled');

  // Take screenshot before clicking
  await page.screenshot({ path: 'test-results/before-submit.png', fullPage: true });

  // Check for validation errors
  const errors = await page.locator('.error-text').count();
  console.log(`Validation errors visible: ${errors}`);

  // Check if button is enabled
  const submitBtn = page.locator('button[type="submit"]').filter({ hasText: /generate/i });
  const isEnabled = await submitBtn.isEnabled();
  const isVisible = await submitBtn.isVisible();
  console.log(`Submit button - Enabled: ${isEnabled}, Visible: ${isVisible}`);

  // Get button text
  const btnText = await submitBtn.textContent();
  console.log(`Button text: "${btnText}"`);

  // Try clicking with force
  console.log('Attempting to click submit button...');
  await submitBtn.click({ force: true });

  // Wait a bit
  await page.waitForTimeout(3000);

  // Take screenshot after clicking
  await page.screenshot({ path: 'test-results/after-submit.png', fullPage: true });

  // Check if loading state appeared
  const loadingText = await page.getByText(/creating|authenticating|processing/i).count();
  console.log(`Loading indicators found: ${loadingText}`);

  // Check if success appeared
  const successContainer = await page.locator('.success-container').count();
  console.log(`Success containers found: ${successContainer}`);

  // Check if error appeared
  const errorMsg = await page.locator('.error-message, [class*="error"]').count();
  console.log(`Error messages found: ${errorMsg}`);

  // Log any console errors that happened
  console.log('\nWaiting 10 seconds to see if anything happens...');
  await page.waitForTimeout(10000);

  await page.screenshot({ path: 'test-results/after-10s-wait.png', fullPage: true });

  // Check current state
  const currentState = await page.evaluate(() => {
    return {
      hasSuccessContainer: !!document.querySelector('.success-container'),
      hasLoadingState: !!document.querySelector('.loading-state-premium'),
      hasErrorMessage: !!document.querySelector('.error-message'),
      formStillVisible: !!document.querySelector('.form-wrapper'),
    };
  });

  console.log('\nCurrent page state:', JSON.stringify(currentState, null, 2));
});
