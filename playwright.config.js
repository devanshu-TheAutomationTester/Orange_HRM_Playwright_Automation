// @ts-check
const { defineConfig, devices } = require('@playwright/test');
const { env, isCI } = require('./config');
const { TIMEOUTS, TAGS } = require('./config/constants');

/**
 * Reporters
 *  - local: list + HTML report (playwright-report/)
 *  - CI:    blob (merged across shards by the "report" job) + GitHub annotations + list
 */
const reporter = isCI
  ? [['blob'], ['github'], ['list']]
  : [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]];

/** Quarantined tests (@quarantine) are skipped unless explicitly requested - see README "Flaky test strategy". */
const runQuarantined = process.env.RUN_QUARANTINED === 'true';

module.exports = defineConfig({
  testDir: './tests',
  outputDir: './test-results',
  timeout: TIMEOUTS.test,
  expect: { timeout: TIMEOUTS.expect },

  // Every test creates its own data through fixtures, so tests (not just files) can run in parallel.
  fullyParallel: true,
  workers: env.workers,
  retries: isCI ? 2 : 0,
  forbidOnly: isCI,
  // Opt-in: make a run fail when a test only passed on retry (use when hunting flakiness).
  failOnFlakyTests: process.env.FAIL_ON_FLAKY === 'true',
  grepInvert: runQuarantined ? undefined : new RegExp(TAGS.quarantine),

  reporter: /** @type {any} */ (reporter),
  metadata: { environment: env.name, baseURL: env.baseURL },

  use: {
    // Trailing slash so page.goto('auth/login') resolves under /web/index.php/
    baseURL: `${env.baseURL}/`,
    headless: process.env.HEADLESS !== 'false',
    viewport: { width: 1440, height: 900 },
    actionTimeout: TIMEOUTS.action,
    navigationTimeout: TIMEOUTS.navigation,
    ignoreHTTPSErrors: true,
    screenshot: 'only-on-failure',
    // Cheap in CI (only failures keep a video); every test is recorded locally unless VIDEO says otherwise.
    video: /** @type {any} */ (process.env.VIDEO || (isCI ? 'retain-on-failure' : 'on')),
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
    // Cross-browser runs are opt-in (BROWSERS=all) because the shared demo site is slow.
    ...(process.env.BROWSERS === 'all'
      ? [
          { name: 'firefox', use: { ...devices['Desktop Firefox'], viewport: { width: 1440, height: 900 } } },
          { name: 'webkit', use: { ...devices['Desktop Safari'], viewport: { width: 1440, height: 900 } } },
        ]
      : []),
  ],
});
