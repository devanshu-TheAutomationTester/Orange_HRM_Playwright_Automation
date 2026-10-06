// @ts-check
/**
 * Custom Playwright fixtures - the only place where sessions, API clients, test data and
 * page objects are created. Specs import { test, expect } from here instead of @playwright/test.
 *
 *   Worker scope (once per parallel worker)
 *     adminStorageState  logs in as Admin through the API and saves a storageState file
 *     adminRequest       APIRequestContext authenticated with that storageState
 *
 *   Test scope (fresh for every test -> tests never share data)
 *     storageState       every browser context starts logged in as Admin (override with test.use)
 *     logger             structured log, attached to the report as test-log.jsonl (auto)
 *     apiClient          OrangeHrmApi facade on the Admin session
 *     employeeData       random, unique employee built from the current data row (not created)
 *     employeeCleanup    registry; teardown deletes every tracked employee that still exists
 *     employee           employee CREATED through the API, deleted in teardown
 *     jobReference       job title + employment status ids, created if the environment lacks them
 *     employeeWithJob    `employee` with job details set through the API
 *     essUser            ESS user (own employee + login) created through the API, deleted in teardown
 *     loginPage, dashboardPage, nav, addEmployeePage, employeeListPage, employeeDetailsPage
 */
const fs = require('fs');
const path = require('path');
const base = require('@playwright/test');

const { env, ROOT } = require('../config');
const { USER_ROLES } = require('../config/constants');
const { OrangeHrmApi, ApiClient } = require('../api');
const { loginViaApi } = require('../api/auth');
const { matchers } = require('./matchers');
const { Logger } = require('../utils/logger');
const { buildEmployee, buildUserCredentials, employeeRows } = require('../utils/testData');
const {
  LoginPage,
  DashboardPage,
  NavigationBar,
  AddEmployeePage,
  EmployeeListPage,
  EmployeeDetailsPage,
} = require('../pages');

const AUTH_DIR = path.join(ROOT, '.auth');
const APP_ROOT = `${env.baseURL}/`;

/**
 * @typedef {import('../utils/testData').EmployeeRow} EmployeeRow
 * @typedef {import('../utils/testData').EmployeeData} EmployeeData
 * @typedef {EmployeeData & { empNumber: number }} SeededEmployee
 * @typedef {{ jobTitle: string, employmentStatus: string, jobTitleId: number, empStatusId: number }} JobReference
 * @typedef {{ username: string, password: string, id: number, employee: SeededEmployee }} EssUser
 *
 * @typedef {{
 *   employeeRow: EmployeeRow,
 *   logger: Logger,
 *   apiClient: OrangeHrmApi,
 *   employeeData: EmployeeData,
 *   employeeCleanup: { track: (employeeId: string) => void },
 *   employee: SeededEmployee,
 *   jobReference: JobReference,
 *   employeeWithJob: SeededEmployee & { job: JobReference },
 *   essUser: EssUser,
 *   loginPage: LoginPage,
 *   dashboardPage: DashboardPage,
 *   nav: NavigationBar,
 *   addEmployeePage: AddEmployeePage,
 *   employeeListPage: EmployeeListPage,
 *   employeeDetailsPage: EmployeeDetailsPage,
 * }} TestFixtures
 *
 * @typedef {{
 *   adminStorageState: string,
 *   adminRequest: import('@playwright/test').APIRequestContext,
 * }} WorkerFixtures
 */

async function seedEmployee(api, cleanup, data) {
  cleanup.track(data.employeeId);
  const created = await api.employees.create(data);
  api.client.logger?.info('seeded employee via API', { employeeId: data.employeeId, empNumber: created.empNumber });
  return { ...data, empNumber: created.empNumber };
}

const test = base.test.extend(
  /** @type {import('@playwright/test').Fixtures<TestFixtures, WorkerFixtures, import('@playwright/test').PlaywrightTestArgs & import('@playwright/test').PlaywrightTestOptions, import('@playwright/test').PlaywrightWorkerArgs & import('@playwright/test').PlaywrightWorkerOptions>} */ ({
    // ---------------------------------------------------------------- options
    /** Data row driving the employee fixtures; set per describe with test.use({ employeeRow }). */
    employeeRow: [employeeRows()[0], { option: true }],

    // ----------------------------------------------------------- worker scope
    adminStorageState: [
      async ({ playwright }, use, workerInfo) => {
        // One login per worker -> each worker has its own server session (no PHP session-lock
        // contention between workers, and one test logging out cannot affect another worker).
        fs.mkdirSync(AUTH_DIR, { recursive: true });
        const file = path.join(AUTH_DIR, `admin-worker-${workerInfo.parallelIndex}.json`);
        const context = await playwright.request.newContext({ baseURL: APP_ROOT, ignoreHTTPSErrors: true });
        try {
          await loginViaApi(context, env.adminCredentials());
          await context.storageState({ path: file });
        } finally {
          await context.dispose();
        }
        await use(file);
      },
      { scope: 'worker' },
    ],

    adminRequest: [
      async ({ playwright, adminStorageState }, use) => {
        const context = await playwright.request.newContext({
          baseURL: APP_ROOT,
          storageState: adminStorageState,
          ignoreHTTPSErrors: true,
        });
        await use(context);
        await context.dispose();
      },
      { scope: 'worker' },
    ],

    // ------------------------------------------------------------- test scope
    storageState: async ({ adminStorageState }, use) => {
      await use(adminStorageState);
    },

    logger: [
      async ({}, use, testInfo) => {
        const logger = new Logger(testInfo.titlePath.slice(1).join(' > '));
        await use(logger);
        if (logger.entries.length > 0) {
          await testInfo.attach('test-log.jsonl', { body: logger.toJSONL(), contentType: 'application/x-ndjson' });
        }
      },
      { auto: true },
    ],

    apiClient: async ({ adminRequest, logger }, use) => {
      await use(new OrangeHrmApi(new ApiClient(adminRequest, { apiBaseURL: env.apiBaseURL, logger })));
    },

    employeeData: async ({ employeeRow }, use, testInfo) => {
      const data = buildEmployee(employeeRow);
      testInfo.annotations.push({
        type: 'test data',
        description: `${data.firstName} ${data.lastName} - Employee Id ${data.employeeId} (row ${employeeRow.key})`,
      });
      await use(data);
    },

    employeeCleanup: async ({ apiClient, logger }, use, testInfo) => {
      /** @type {Set<string>} */
      const employeeIds = new Set();
      await use({ track: (employeeId) => employeeIds.add(employeeId) });

      for (const employeeId of employeeIds) {
        try {
          const matches = await apiClient.employees.findByEmployeeId(employeeId);
          if (matches.length === 0) continue; // the test itself deleted it (or creation never happened)
          const response = await apiClient.employees.delete(matches.map((e) => e.empNumber));
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          logger.info('teardown: deleted employee', { employeeId });
        } catch (error) {
          // Teardown problems must not hide the test's real result, but they must be visible.
          const message = `teardown: could not delete employee ${employeeId}: ${/** @type {Error} */ (error).message}`;
          logger.warn(message);
          testInfo.annotations.push({ type: 'cleanup warning', description: message });
        }
      }
    },

    employee: async ({ apiClient, employeeCleanup, employeeData }, use) => {
      await use(await seedEmployee(apiClient, employeeCleanup, employeeData));
    },

    jobReference: async ({ apiClient, employeeRow }, use) => {
      const { jobTitle, employmentStatus } = employeeRow.update;
      await use({
        jobTitle,
        employmentStatus,
        jobTitleId: await apiClient.admin.ensureJobTitle(jobTitle),
        empStatusId: await apiClient.admin.ensureEmploymentStatus(employmentStatus),
      });
    },

    employeeWithJob: async ({ apiClient, employee, jobReference }, use) => {
      await apiClient.employees.updateJobDetails(employee.empNumber, jobReference);
      await use({ ...employee, job: jobReference });
    },

    essUser: async ({ apiClient, employeeCleanup, employeeRow, logger }, use, testInfo) => {
      // The ESS user gets its OWN employee record, separate from the `employee` fixture,
      // so a test can use both (e.g. ESS user tries to delete someone else).
      const ownEmployee = await seedEmployee(apiClient, employeeCleanup, buildEmployee(employeeRow));
      const credentials = buildUserCredentials('ess');
      const user = await apiClient.admin.createUser({
        ...credentials,
        empNumber: ownEmployee.empNumber,
        userRoleId: USER_ROLES.ess,
      });
      logger.info('seeded ESS user via API', { username: credentials.username, userId: user.id });
      testInfo.annotations.push({ type: 'ESS user', description: credentials.username });

      await use({ ...credentials, id: user.id, employee: ownEmployee });

      const response = await apiClient.admin.deleteUsers([user.id]);
      if (!response.ok) {
        const message = `teardown: could not delete user ${credentials.username} - HTTP ${response.status}`;
        logger.warn(message);
        testInfo.annotations.push({ type: 'cleanup warning', description: message });
      }
    },

    // ----------------------------------------------------------- page objects
    loginPage: async ({ page }, use) => {
      await use(new LoginPage(page));
    },
    dashboardPage: async ({ page }, use) => {
      await use(new DashboardPage(page));
    },
    nav: async ({ page }, use) => {
      await use(new NavigationBar(page));
    },
    addEmployeePage: async ({ page }, use) => {
      await use(new AddEmployeePage(page));
    },
    employeeListPage: async ({ page }, use) => {
      await use(new EmployeeListPage(page));
    },
    employeeDetailsPage: async ({ page }, use) => {
      await use(new EmployeeDetailsPage(page));
    },
  })
);

const expect = base.expect.extend(matchers);

// For tests that must start logged out (they exercise the login form themselves).
const LOGGED_OUT = Object.freeze({ cookies: [], origins: [] });

module.exports = { test, expect, LOGGED_OUT };
