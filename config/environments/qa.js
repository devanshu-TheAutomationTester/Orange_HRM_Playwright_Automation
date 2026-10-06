// @ts-check
/**
 * QA environment. The URL comes from QA_BASE_URL (in .env.qa or the CI environment "qa"),
 * so no internal host name is committed to the repository.
 * @type {import('../index').EnvironmentConfig}
 */
module.exports = {
  name: 'qa',
  baseURL: process.env.QA_BASE_URL,
  workers: 4,
  ciWorkers: 4,
};
