// @ts-check
/**
 * Public OrangeHRM demo. Shared with everyone on the internet, so it is slow at times and its
 * reference data can change - the suite creates whatever it needs through the API (see fixtures/).
 * Credentials are NOT stored here: set ORANGEHRM_USERNAME / ORANGEHRM_PASSWORD in .env or CI secrets.
 * @type {import('../index').EnvironmentConfig}
 */
module.exports = {
  name: 'demo',
  baseURL: 'https://opensource-demo.orangehrmlive.com/web/index.php',
  workers: 4,
  ciWorkers: 2,
};
