import { chromium } from 'playwright';

async function testTailwindV4() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    // Login
    console.log('🔐 Logging in...');
    await page.goto('https://thumbnails.schreinercontentsystems.com');
    await page.waitForTimeout(2000);

    await page.locator('input[type="email"]').fill('konrad.schrein@gmail.com');
    await page.locator('input[type="password"]').fill('testva1234');
    await page.locator('button[type="submit"]').click();

    await page.waitForTimeout(3000);

    // Go to admin
    console.log('📊 Navigating to admin panel...');
    await page.goto('https://thumbnails.schreinercontentsystems.com/admin');
    await page.waitForTimeout(5000);

    // Check if Tailwind CSS is loaded and working
    console.log('\n🎨 Checking Tailwind v4 CSS...\n');

    const cssChecks = await page.evaluate(() => {
      const results: Record<string, any> = {};

      // Check body background (should be dark from gradient)
      const body = document.body;
      const bodyStyles = window.getComputedStyle(body);
      results.bodyBackgroundColor = bodyStyles.backgroundColor;
      results.bodyColor = bodyStyles.color;

      // Check if main container has dark gradient
      const mainContainer = document.querySelector('div[class*="bg-gradient"]');
      if (mainContainer) {
        const containerStyles = window.getComputedStyle(mainContainer as Element);
        results.containerBackground = containerStyles.backgroundImage;
        results.containerHasGradient = containerStyles.backgroundImage.includes('gradient');
      }

      // Check if stat cards are styled
      const statCards = document.querySelectorAll('div[class*="from-blue"]');
      results.statCardsFound = statCards.length;
      if (statCards.length > 0) {
        const cardStyles = window.getComputedStyle(statCards[0]);
        results.statCardBackground = cardStyles.backgroundImage;
        results.statCardBorder = cardStyles.borderColor;
        results.statCardHasGradient = cardStyles.backgroundImage.includes('gradient');
      }

      // Check if buttons are styled
      const buttons = document.querySelectorAll('button');
      results.buttonsFound = buttons.length;
      if (buttons.length > 0) {
        const buttonStyles = window.getComputedStyle(buttons[0]);
        results.buttonPadding = buttonStyles.padding;
        results.buttonBackground = buttonStyles.backgroundColor;
      }

      // Check for Tailwind utility classes in DOM
      const allElements = document.querySelectorAll('[class]');
      const tailwindClasses = new Set<string>();
      allElements.forEach(el => {
        const classes = el.className.toString().split(' ');
        classes.forEach(cls => {
          if (cls.match(/^(bg-|text-|p-|m-|flex|grid|rounded|border|shadow)/)) {
            tailwindClasses.add(cls);
          }
        });
      });
      results.tailwindClassesFound = Array.from(tailwindClasses).length;
      results.sampleClasses = Array.from(tailwindClasses).slice(0, 10);

      return results;
    });

    // Print results
    console.log('Body Styling:');
    console.log(`  Background Color: ${cssChecks.bodyBackgroundColor}`);
    console.log(`  Text Color: ${cssChecks.bodyColor}`);
    console.log();

    console.log('Main Container:');
    console.log(`  Has Gradient: ${cssChecks.containerHasGradient ? '✅' : '❌'}`);
    if (cssChecks.containerHasGradient) {
      console.log(`  Background: ${cssChecks.containerBackground}`);
    }
    console.log();

    console.log('Stat Cards:');
    console.log(`  Found: ${cssChecks.statCardsFound}`);
    console.log(`  Has Gradient: ${cssChecks.statCardHasGradient ? '✅' : '❌'}`);
    if (cssChecks.statCardHasGradient) {
      console.log(`  Background: ${cssChecks.statCardBackground}`);
      console.log(`  Border: ${cssChecks.statCardBorder}`);
    }
    console.log();

    console.log('Buttons:');
    console.log(`  Found: ${cssChecks.buttonsFound}`);
    console.log(`  Styled: ${cssChecks.buttonPadding !== '0px' ? '✅' : '❌'}`);
    console.log();

    console.log('Tailwind Utilities:');
    console.log(`  Unique Classes: ${cssChecks.tailwindClassesFound}`);
    console.log(`  Sample Classes: ${cssChecks.sampleClasses.join(', ')}`);
    console.log();

    // Take screenshots
    await page.screenshot({ path: 'admin-tailwind-v4-full.png', fullPage: true });
    console.log('📸 Full page screenshot: admin-tailwind-v4-full.png');

    await page.screenshot({ path: 'admin-tailwind-v4-viewport.png' });
    console.log('📸 Viewport screenshot: admin-tailwind-v4-viewport.png');

    // Overall assessment
    console.log('\n🎯 Overall Assessment:');
    const isStyled = cssChecks.containerHasGradient &&
                     cssChecks.statCardHasGradient &&
                     cssChecks.tailwindClassesFound > 50;

    if (isStyled) {
      console.log('✅ Tailwind v4 CSS is working correctly!');
      console.log('✅ Admin panel is properly styled');
    } else {
      console.log('❌ CSS issues detected:');
      if (!cssChecks.containerHasGradient) console.log('  - Main container gradient not applied');
      if (!cssChecks.statCardHasGradient) console.log('  - Stat card gradients not applied');
      if (cssChecks.tailwindClassesFound < 50) console.log('  - Insufficient Tailwind classes found');
    }

  } finally {
    await browser.close();
  }
}

testTailwindV4();
