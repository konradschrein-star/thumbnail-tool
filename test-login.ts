/**
 * Playwright test to verify login functionality
 */
import { chromium } from 'playwright';

async function testLogin() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('🔍 Testing login at https://thumbnails.schreinercontentsystems.com\n');

    // Navigate to the site
    await page.goto('https://thumbnails.schreinercontentsystems.com', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    console.log('✓ Page loaded');

    // Wait a bit for any animations
    await page.waitForTimeout(2000);

    // Try to find login form - check both possible pages
    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();

    console.log('✓ Found login form');

    // Fill in credentials
    await emailInput.fill('konrad.schrein@gmail.com');
    await passwordInput.fill('testva1234');

    console.log('✓ Filled credentials: konrad.schrein@gmail.com / testva1234');

    // Listen for network requests to the auth endpoint
    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('/api/auth')) {
        console.log(`📡 Auth API Response: ${response.status()}`);
        try {
          const body = await response.text();
          console.log('Response body:', body.substring(0, 200));
        } catch (e) {
          // Ignore if can't read body
        }
      }
    });

    // Find and click submit button
    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();

    console.log('✓ Clicked submit button');

    // Wait for response
    await page.waitForTimeout(3000);

    // Check for error messages
    const errorMessage = await page.locator('text=/invalid/i').first().textContent().catch(() => null);
    if (errorMessage) {
      console.log('❌ Error message found:', errorMessage);
    }

    // Check if redirected to dashboard
    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);

    if (currentUrl.includes('/dashboard')) {
      console.log('✅ LOGIN SUCCESSFUL - Redirected to dashboard!');
    } else {
      console.log('❌ LOGIN FAILED - Still on login page');

      // Take screenshot
      await page.screenshot({ path: 'login-failed.png', fullPage: true });
      console.log('📸 Screenshot saved to login-failed.png');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
    await page.screenshot({ path: 'login-error.png', fullPage: true });
    console.log('📸 Error screenshot saved to login-error.png');
  } finally {
    await browser.close();
  }
}

testLogin();
