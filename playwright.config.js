// @ts-check
require('dotenv').config();
const { defineConfig, devices } = require('@playwright/test');

const BASE_URL = (process.env.BASE_URL || 'https://opensource-demo.orangehrmlive.com/web/index.php').replace(/\/$/, '');

module.exports = defineConfig({
  testDir: './tests',
  outputDir: './test-results', // videos, traces and failure screenshots (one folder per test)
  timeout: 5 * 60 * 1000, // whole scenario - the public demo site can be slow
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1, // the lifecycle tests share one public demo site; run them one after another
  retries: process.env.CI ? 1 : 0,
  forbidOnly: !!process.env.CI,

  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],

  use: {
    // Trailing slash so page.goto('auth/login') resolves under /web/index.php/
    baseURL: `${BASE_URL}/`,
    headless: process.env.HEADLESS !== 'false',
    viewport: { width: 1440, height: 900 },
    actionTimeout: 20_000,
    navigationTimeout: 60_000,
    ignoreHTTPSErrors: true,
    video: { mode: 'on', size: { width: 1440, height: 900 } }, // record every test
    screenshot: 'only-on-failure',
    trace: process.env.KEEP_TRACE === 'true' ? 'on' : 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        // Optional: use an already-installed Chromium instead of Playwright's download.
        ...(process.env.CHROMIUM_PATH && { launchOptions: { executablePath: process.env.CHROMIUM_PATH } }),
      },
    },
  ],
});
