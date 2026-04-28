const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Capture ALL console messages
  const consoleMessages = [];
  page.on('console', msg => {
    consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
  });
  
  const pageErrors = [];
  page.on('pageerror', error => {
    pageErrors.push(error.toString());
  });
  
  try {
    console.log('Navigating to login page...');
    await page.goto('https://thumbnails.schreinercontentsystems.com/auth/signin', { waitUntil: 'networkidle' });
    
    console.log('Logging in with test account...');
    await page.fill('input[type="email"]', 'test@test.ai');
    await page.fill('input[type="password"]', 'test');
    await page.click('button[type="submit"]');
    
    console.log('Waiting for navigation...');
    await page.waitForURL('**/dashboard**', { timeout: 10000 }).catch(() => {
      console.log('Did not navigate to dashboard');
    });
    
    await page.waitForTimeout(3000);
    
    console.log('\n=== CURRENT URL ===');
    console.log(page.url());
    
    console.log('\n=== PAGE ERRORS ===');
    pageErrors.forEach(err => console.log(err));
    
    console.log('\n=== CONSOLE MESSAGES (last 20) ===');
    consoleMessages.slice(-20).forEach(msg => console.log(msg));
    
    // Take screenshot
    await page.screenshot({ path: 'dashboard-test.png', fullPage: true });
    console.log('\nScreenshot saved to dashboard-test.png');
    
  } catch (error) {
    console.error('Test error:', error.message);
  } finally {
    await browser.close();
  }
})();
