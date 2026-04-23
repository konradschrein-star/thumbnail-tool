# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: debug-form-submission.spec.ts >> Debug Form Submission
- Location: tests\debug-form-submission.spec.ts:8:5

# Error details

```
TimeoutError: page.waitForURL: Timeout 15000ms exceeded.
=========================== logs ===========================
waiting for navigation to "**/dashboard" until "load"
  navigated to "http://localhost:3072/api/auth/error"
  navigated to "http://localhost:3072/api/auth/error"
============================================================
```

# Page snapshot

```yaml
- generic:
  - generic [active]:
    - generic [ref=e3]:
      - generic [ref=e4]:
        - generic [ref=e5]:
          - navigation [ref=e6]:
            - button "previous" [disabled] [ref=e7]:
              - img "previous" [ref=e8]
            - generic [ref=e10]:
              - generic [ref=e11]: 1/
              - text: "1"
            - button "next" [disabled] [ref=e12]:
              - img "next" [ref=e13]
          - img
        - generic [ref=e15]:
          - generic [ref=e16]:
            - img [ref=e17]
            - generic "Latest available version is detected (16.2.4)." [ref=e19]: Next.js 16.2.4
            - generic [ref=e20]: Turbopack
          - img
      - generic [ref=e21]:
        - dialog "Runtime Error" [ref=e22]:
          - generic [ref=e25]:
            - generic [ref=e26]:
              - generic [ref=e27]:
                - generic [ref=e29]: Runtime Error
                - generic [ref=e30]:
                  - button "Copy Error Info" [ref=e31] [cursor=pointer]:
                    - img [ref=e32]
                  - button "No related documentation found" [disabled] [ref=e34]:
                    - img [ref=e35]
                  - button "Attach Node.js inspector" [ref=e37] [cursor=pointer]:
                    - img [ref=e38]
              - generic [ref=e47]: Jest worker encountered 2 child process exceptions, exceeding retry limit
            - generic [ref=e50]:
              - paragraph [ref=e51]:
                - text: Call Stack
                - generic [ref=e52]: "5"
              - button "Show 5 ignore-listed frame(s)" [ref=e53] [cursor=pointer]:
                - text: Show 5 ignore-listed frame(s)
                - img [ref=e54]
          - generic [ref=e56]: "1"
          - generic [ref=e57]: "2"
        - contentinfo [ref=e58]:
          - region "Error feedback" [ref=e59]:
            - paragraph [ref=e60]:
              - link "Was this helpful?" [ref=e61] [cursor=pointer]:
                - /url: https://nextjs.org/telemetry#error-feedback
            - button "Mark as helpful" [ref=e62] [cursor=pointer]:
              - img [ref=e63]
            - button "Mark as not helpful" [ref=e66] [cursor=pointer]:
              - img [ref=e67]
    - generic [ref=e73] [cursor=pointer]:
      - button "Open Next.js Dev Tools" [ref=e74]:
        - img [ref=e75]
      - generic [ref=e78]:
        - button "Open issues overlay" [ref=e79]:
          - generic [ref=e80]:
            - generic [ref=e81]: "0"
            - generic [ref=e82]: "1"
          - generic [ref=e83]: Issue
        - button "Collapse issues badge" [ref=e84]:
          - img [ref=e85]
  - alert [ref=e87]
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | const TEST_EMAIL = 'test@test.ai';
  4   | const TEST_PASSWORD = 'test';
  5   | const TEST_CHANNEL_ID = 'cmms4ixmf0000pt5ohqtgfqce';
  6   | const TEST_ARCHETYPE_ID = 'cmmsgq3gw0007dq6s08mpi8gh';
  7   | 
  8   | test('Debug Form Submission', async ({ page }) => {
  9   |   test.setTimeout(180000);
  10  | 
  11  |   // Login
  12  |   await page.goto('/');
  13  |   await page.waitForLoadState('networkidle');
  14  |   await page.waitForTimeout(1000);
  15  | 
  16  |   const emailInput = page.locator('input[type="email"]');
  17  |   const isLoginPage = await emailInput.isVisible({ timeout: 3000 }).catch(() => false);
  18  | 
  19  |   if (isLoginPage) {
  20  |     await page.fill('input[type="email"]', TEST_EMAIL);
  21  |     await page.fill('input[type="password"]', TEST_PASSWORD);
  22  |     await page.locator('button[type="submit"]').first().click();
> 23  |     await page.waitForURL('**/dashboard', { timeout: 15000 });
      |                ^ TimeoutError: page.waitForURL: Timeout 15000ms exceeded.
  24  |     console.log('✓ Logged in');
  25  |   }
  26  | 
  27  |   // Navigate to Generate
  28  |   await page.goto('/dashboard?tab=generate');
  29  |   await page.waitForLoadState('networkidle');
  30  |   console.log('✓ On Generate tab');
  31  | 
  32  |   // Fill form
  33  |   await page.waitForSelector('select[title="Select Channel"]', { timeout: 10000 });
  34  |   await page.selectOption('select[title="Select Channel"]', TEST_CHANNEL_ID);
  35  |   await page.waitForTimeout(1000);
  36  |   await page.selectOption('select[title="Select Archetype"]', TEST_ARCHETYPE_ID);
  37  | 
  38  |   const videoTopicInput = page.locator('input[placeholder*="How to build"]');
  39  |   await videoTopicInput.fill('Test Generation Debug');
  40  | 
  41  |   const thumbnailTextInput = page.locator('input[maxlength="50"]');
  42  |   await thumbnailTextInput.fill('DEBUG TEST');
  43  | 
  44  |   console.log('✓ Form filled');
  45  | 
  46  |   // Take screenshot before clicking
  47  |   await page.screenshot({ path: 'test-results/before-submit.png', fullPage: true });
  48  | 
  49  |   // Check for validation errors
  50  |   const errors = await page.locator('.error-text').count();
  51  |   console.log(`Validation errors visible: ${errors}`);
  52  | 
  53  |   // Check if button is enabled
  54  |   const submitBtn = page.locator('button[type="submit"]').filter({ hasText: /generate/i });
  55  |   const isEnabled = await submitBtn.isEnabled();
  56  |   const isVisible = await submitBtn.isVisible();
  57  |   console.log(`Submit button - Enabled: ${isEnabled}, Visible: ${isVisible}`);
  58  | 
  59  |   // Get button text
  60  |   const btnText = await submitBtn.textContent();
  61  |   console.log(`Button text: "${btnText}"`);
  62  | 
  63  |   // Try clicking with force
  64  |   console.log('Attempting to click submit button...');
  65  |   await submitBtn.click({ force: true });
  66  | 
  67  |   // Wait a bit
  68  |   await page.waitForTimeout(3000);
  69  | 
  70  |   // Take screenshot after clicking
  71  |   await page.screenshot({ path: 'test-results/after-submit.png', fullPage: true });
  72  | 
  73  |   // Check if loading state appeared
  74  |   const loadingText = await page.getByText(/creating|authenticating|processing/i).count();
  75  |   console.log(`Loading indicators found: ${loadingText}`);
  76  | 
  77  |   // Check if success appeared
  78  |   const successContainer = await page.locator('.success-container').count();
  79  |   console.log(`Success containers found: ${successContainer}`);
  80  | 
  81  |   // Check if error appeared
  82  |   const errorMsg = await page.locator('.error-message, [class*="error"]').count();
  83  |   console.log(`Error messages found: ${errorMsg}`);
  84  | 
  85  |   // Log any console errors that happened
  86  |   console.log('\nWaiting 10 seconds to see if anything happens...');
  87  |   await page.waitForTimeout(10000);
  88  | 
  89  |   await page.screenshot({ path: 'test-results/after-10s-wait.png', fullPage: true });
  90  | 
  91  |   // Check current state
  92  |   const currentState = await page.evaluate(() => {
  93  |     return {
  94  |       hasSuccessContainer: !!document.querySelector('.success-container'),
  95  |       hasLoadingState: !!document.querySelector('.loading-state-premium'),
  96  |       hasErrorMessage: !!document.querySelector('.error-message'),
  97  |       formStillVisible: !!document.querySelector('.form-wrapper'),
  98  |     };
  99  |   });
  100 | 
  101 |   console.log('\nCurrent page state:', JSON.stringify(currentState, null, 2));
  102 | });
  103 | 
```