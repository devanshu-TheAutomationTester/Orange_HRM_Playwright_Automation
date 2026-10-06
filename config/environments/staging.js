// @ts-check
/**
 * Staging environment. The URL comes from STAGING_BASE_URL (in .env.staging or the CI environment "staging").
 * Fewer workers - staging is closer to production and usually shared with manual testers.
 * @type {import('../index').EnvironmentConfig}
 */
module.exports = {
  name: 'staging',
  baseURL: process.env.STAGING_BASE_URL,
  workers: 2,
  ciWorkers: 2,
};
