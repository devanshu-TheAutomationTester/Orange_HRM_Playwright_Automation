// @ts-check
/**
 * Single entry point for runtime configuration.
 *
 * Select the environment with TEST_ENV (demo | qa | staging, default demo):
 *   npm run test:qa            (cross-platform, via cross-env)
 *   TEST_ENV=qa npx playwright test
 *
 * Load order (first value wins): real environment variables > .env.<TEST_ENV> > .env
 */
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

/**
 * @typedef {object} EnvironmentConfig
 * @property {string} name
 * @property {string | undefined} baseURL
 * @property {number} workers     parallel workers for local runs
 * @property {number} ciWorkers   parallel workers per CI shard
 **/

const ROOT = path.resolve(__dirname, '..');
const TEST_ENV = (process.env.TEST_ENV || 'demo').toLowerCase();

for (const file of [`.env.${TEST_ENV}`, '.env']) {
  const fullPath = path.join(ROOT, file);
  if (fs.existsSync(fullPath)) dotenv.config({ path: fullPath, quiet: true });
}

const ENV_DIR = path.join(__dirname, 'environments');
const available = fs.readdirSync(ENV_DIR).map((f) => path.parse(f).name);
if (!available.includes(TEST_ENV)) {
  throw new Error(`Unknown TEST_ENV "${TEST_ENV}". Available: ${available.join(', ')}`);
}

/** @type {EnvironmentConfig} **/
const environment = require(path.join(ENV_DIR, TEST_ENV));

const baseURL = (process.env.BASE_URL || environment.baseURL || '').replace(/\/$/, '');
if (!baseURL) {
  throw new Error(
    `No base URL for TEST_ENV "${TEST_ENV}". Set BASE_URL or the variable read by config/environments/${TEST_ENV}.js`
  );
}

/**
 * Admin credentials, validated only when a test actually needs them so that
 * `playwright test --list` and linting work without secrets.
 * @returns {{ username: string, password: string }}
 */
function adminCredentials() {
  const username = process.env.ORANGEHRM_USERNAME;
  const password = process.env.ORANGEHRM_PASSWORD;
  if (!username || !password) {
    throw new Error(
      'Missing credentials: set ORANGEHRM_USERNAME and ORANGEHRM_PASSWORD in .env / .env.<TEST_ENV> or as CI secrets'
    );
  }
  return { username, password };
}

const isCI = !!process.env.CI;

module.exports = {
  ROOT,
  isCI,
  env: {
    name: environment.name,
    baseURL,
    /** API root, e.g. https://host/web/index.php/api/v2 */
    apiBaseURL: `${baseURL}/api/v2`,
    workers: Number(process.env.WORKERS) || (isCI ? environment.ciWorkers : environment.workers),
    adminCredentials,
  },
};
