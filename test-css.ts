import { chromium } from 'playwright';

async function testCSS() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    // Login
    await page.goto('https://thumbnails.schreinercontentsystems.com');
    await page.waitForTimeout(2000);

    await page.locator('input[type="email"]').fill('konrad.schrein@gmail.com');
    await page.locator('input[type="password"]').fill('testva1234');
    await page.locator('button[type="submit"]').click();

    await page.waitForTimeout(3000);

    // Go to admin
    await page.goto('https://thumbnails.schreinercontentsystems.com/admin');
    await page.waitForTimeout(5000);

    // Take screenshot
    await page.screenshot({ path: 'admin-with-css.png', fullPage: true });
    console.log('✅ Screenshot saved to admin-with-css.png');

    // Check if CSS loaded
    const hasBackgroundColor = await page.evaluate(() => {
      const body = document.body;
      const styles = window.getComputedStyle(body);
      return styles.backgroundColor !== 'rgba(0, 0, 0, 0)';
    });

    console.log(`CSS loaded: ${hasBackgroundColor ? '✅ YES' : '❌ NO'}`);

  } finally {
    await browser.close();
  }
}

testCSS();
