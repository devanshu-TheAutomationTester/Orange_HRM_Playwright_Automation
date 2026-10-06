// @ts-check
const { ApiClient } = require('./apiClient');
const { EmployeesApi } = require('./endpoints/employeesApi');
const { AdminApi } = require('./endpoints/adminApi');
const { env } = require('../config');

/**
 * Facade over the endpoint groups: `api.employees.create(...)`, `api.admin.createUser(...)`.
 * Bound to whichever request context it is given - the Admin worker session (apiClient fixture)
 * or a page's own session (`OrangeHrmApi.forPage(page)`, e.g. to act as the logged-in ESS user).
 */
class OrangeHrmApi {
  /** @param {ApiClient} client */
  constructor(client) {
    this.client = client;
    this.employees = new EmployeesApi(client);
    this.admin = new AdminApi(client);
  }

  /**
   * API client sharing the browser page's cookies (i.e. "whoever is logged in on this page").
   * @param {import('@playwright/test').Page} page
   * @param {import('../utils/logger').Logger} [logger]
   */
  static forPage(page, logger) {
    return new OrangeHrmApi(new ApiClient(page.request, { apiBaseURL: env.apiBaseURL, logger }));
  }
}

module.exports = { OrangeHrmApi, ApiClient };
