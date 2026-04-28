const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Capture console logs
  const consoleLogs = [];
  page.on('console', msg => {
    consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
  });

  try {
    console.log('Logging in...');
    await page.goto('https://thumbnails.schreinercontentsystems.com/auth/signin');
    await page.fill('input[type="email"]', 'test@test.ai');
    await page.fill('input[type="password"]', 'test');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard**', { timeout: 10000 });

    console.log('Navigating to Generate tab...');
    await page.click('text=Generate');
    await page.waitForTimeout(2000);

    // Wait for channel selector to be visible and populated
    await page.waitForSelector('select[title="Filter by Channel"]', { state: 'visible', timeout: 5000 });

    console.log('Selecting Test channel...');
    await page.selectOption('select[title="Filter by Channel"]', { label: 'Test' });
    await page.waitForTimeout(1500);

    // Check for persona preview
    const result = await page.evaluate(() => {
      // Find channel selector
      const channelSelect = document.querySelector('select[title="Filter by Channel"]');
      const selectedValue = channelSelect?.value;

      // Check for persona preview card
      const personaPreview = document.querySelector('.persona-preview-card');
      const personaImage = document.querySelector('.persona-preview-card img');

      // Try to access React internals to see actual data
      const reactKey = Object.keys(channelSelect || {}).find(key => key.startsWith('__reactFiber'));
      let channelsData = null;
      let selectedChannel = null;

      if (reactKey && channelSelect) {
        try {
          let fiber = channelSelect[reactKey];
          // Navigate up to find component with channels state
          while (fiber && !channelsData) {
            if (fiber.memoizedProps?.channels) {
              channelsData = fiber.memoizedProps.channels;
            }
            // Also check memoizedState for hooks
            if (fiber.memoizedState) {
              let state = fiber.memoizedState;
              while (state) {
                if (Array.isArray(state.memoizedState) && state.memoizedState.length > 0) {
                  const potentialChannels = state.memoizedState;
                  if (potentialChannels[0]?.personaDescription) {
                    channelsData = potentialChannels;
                  }
                }
                state = state.next;
              }
            }
            fiber = fiber.return;
          }

          if (channelsData && selectedValue) {
            selectedChannel = channelsData.find(c => c.id === selectedValue);
          }
        } catch (e) {
          console.log('Error accessing React internals:', e.message);
        }
      }

      return {
        channelSelectValue: selectedValue,
        personaPreviewExists: !!personaPreview,
        personaImageExists: !!personaImage,
        personaImageSrc: personaImage?.src,
        channelsCount: Array.isArray(channelsData) ? channelsData.length : 'unknown',
        testChannelData: selectedChannel ? {
          id: selectedChannel.id,
          name: selectedChannel.name,
          personaAssetPath: selectedChannel.personaAssetPath
        } : 'not found'
      };
    });

    console.log('\n=== PERSONA PREVIEW DEBUG ===');
    console.log(JSON.stringify(result, null, 2));

    console.log('\n=== CONSOLE LOGS ===');
    consoleLogs.forEach(log => console.log(log));

    await page.screenshot({ path: 'persona-preview-debug.png', fullPage: true });
    console.log('\nScreenshot saved to persona-preview-debug.png');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();
