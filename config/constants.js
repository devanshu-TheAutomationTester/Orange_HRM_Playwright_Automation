// @ts-check
/**
 * Every timeout, UI message, route and role id used by the suite lives here -
 * page objects and specs import from this file instead of repeating literals.
 **/

const TIMEOUTS = Object.freeze({
  /** Whole test, including fixture setup/teardown. **/
  test: 2 * 60_000,
  /** Default for web-first assertions (expect(...).toBeVisible() etc.). **/
  expect: 20_000,
  action: 20_000,
  navigation: 60_000,
  /** OrangeHRM form loaders / spinners and page-level redirects. **/
  pageReady: 30_000,
  /** The full Employee List can take a long time to load on the shared demo. **/
  slowList: 60_000,
  apiRequest: 30_000,
  /** How long a typed value must stick before re-typing (OrangeHRM pre-fills some fields asynchronously). */
  fieldSettle: 2_000,
});

const MESSAGES = Object.freeze({
  saved: 'Successfully Saved',
  updated: 'Successfully Updated',
  deleted: 'Successfully Deleted',
  invalidCredentials: 'Invalid credentials',
  credentialRequired: 'Credential Required',
  noRecords: 'No Records Found',
  oneRecord: '(1) Record Found',
});

const ROUTES = Object.freeze({
  login: 'auth/login',
  dashboard: 'dashboard/index',
  employeeList: 'pim/viewEmployeeList',
  addEmployee: 'pim/addEmployee',
  systemUsers: 'admin/viewSystemUsers',
  /** @param {number} empNumber **/
  personalDetails: (empNumber) => `pim/viewPersonalDetails/empNumber/${empNumber}`,
  /** @param {number} empNumber **/
  jobDetails: (empNumber) => `pim/viewJobDetails/empNumber/${empNumber}`,
});

/** URL patterns used in toHaveURL assertions. **/
const URL_PATTERNS = Object.freeze({
  login: /\/auth\/login/,
  dashboard: /\/dashboard\/index/,
  employeeList: /\/pim\/viewEmployeeList/,
  addEmployee: /\/pim\/addEmployee/,
  personalDetails: /\/pim\/viewPersonalDetails\/empNumber\/(\d+)/,
  jobDetails: /\/pim\/viewJobDetails\/empNumber\/\d+/,
});

/** OrangeHRM built-in user role ids (Admin > User Management). **/
const USER_ROLES = Object.freeze({ admin: 1, ess: 2 });

/** Side-menu entries. **/
const MENU = Object.freeze({
  admin: 'Admin',
  pim: 'PIM',
  myInfo: 'My Info',
  dashboard: 'Dashboard',
});

/** OrangeHRM limits Employee Id to 10 characters. **/
const EMPLOYEE_ID_MAX_LENGTH = 10;

/** Tags - keep in sync with the "Tagging strategy" section of the README. **/
const TAGS = Object.freeze({
  smoke: '@smoke',
  regression: '@regression',
  ui: '@ui',
  api: '@api',
  rbac: '@rbac',
  p1: '@p1',
  p2: '@p2',
  quarantine: '@quarantine',
});

module.exports = { TIMEOUTS, MESSAGES, ROUTES, URL_PATTERNS, USER_ROLES, MENU, EMPLOYEE_ID_MAX_LENGTH, TAGS };
