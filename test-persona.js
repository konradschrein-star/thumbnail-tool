const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Capture console logs
  page.on('console', msg => console.log('[BROWSER]', msg.text()));
  
  try {
    await page.goto('https://thumbnails.schreinercontentsystems.com/auth/signin');
    await page.fill('input[type="email"]', 'test@test.ai');
    await page.fill('input[type="password"]', 'test');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard**', { timeout: 10000 });
    
    // Navigate to Generate tab
    await page.click('text=Generate');
    await page.waitForTimeout(2000);
    
    // Select the Test channel
    await page.selectOption('select', { label: 'Test' });
    await page.waitForTimeout(1000);
    
    // Check if persona preview appears
    const result = await page.evaluate(() => {
      const personaPreview = document.querySelector('.persona-preview-card');
      const selectElement = document.querySelector('select');
      
      // Try to access React internals to see channel data
      const reactKey = Object.keys(selectElement || {}).find(key => key.startsWith('__react'));
      let channelsData = null;
      
      if (reactKey && selectElement) {
        try {
          const fiber = selectElement[reactKey];
          // Navigate up to find component with channels prop
          let current = fiber;
          while (current && !channelsData) {
            if (current.memoizedProps?.channels) {
              channelsData = current.memoizedProps.channels;
            }
            current = current.return;
          }
        } catch (e) {
          console.log('Error accessing React:', e.message);
        }
      }
      
      return {
        selectedValue: selectElement?.value,
        personaPreviewExists: !!personaPreview,
        channelsCount: Array.isArray(channelsData) ? channelsData.length : 'unknown',
        firstChannelData: Array.isArray(channelsData) && channelsData[0] ? {
          id: channelsData[0].id,
          name: channelsData[0].name,
          hasPersonaAssetPath: !!channelsData[0].personaAssetPath,
          personaAssetPath: channelsData[0].personaAssetPath
        } : null
      };
    });
    
    console.log('\nResult:', JSON.stringify(result, null, 2));
    
    await page.screenshot({ path: 'persona-debug.png' });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();
