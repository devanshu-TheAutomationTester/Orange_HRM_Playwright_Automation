// @ts-check
const { test, expect, LOGGED_OUT } = require('../../fixtures');
const { OrangeHrmApi } = require('../../api');
const { env } = require('../../config');
const { ROUTES, TAGS } = require('../../config/constants');
const { invalidPassword } = require('../../utils/testData');

test.describe('Authentication', { tag: [TAGS.ui] }, () => {
  // These tests exercise the login form, so each one starts with an empty browser context
  // (and therefore its own server session) instead of the shared Admin storageState.
  test.use({ storageState: LOGGED_OUT });

  test('Valid credentials open the dashboard', { tag: [TAGS.smoke, TAGS.p1] }, async ({ loginPage, dashboardPage }) => {
    await loginPage.login(env.adminCredentials());
    await dashboardPage.expectDashboard();
  });

  test('Invalid credentials are rejected', { tag: [TAGS.smoke, TAGS.p1] }, async ({ loginPage }) => {
    const { username } = env.adminCredentials();
    await loginPage.login({ username, password: invalidPassword() });
    await loginPage.expectInvalidCredentialsError();
  });

  test(
    'Logout invalidates the session in the UI and the API',
    { tag: [TAGS.smoke, TAGS.api, TAGS.p1] },
    async ({ page, loginPage, dashboardPage, nav, logger }) => {
      const sessionApi = OrangeHrmApi.forPage(page, logger);

      await test.step('Log in through the UI', async () => {
        await loginPage.login(env.adminCredentials());
        await dashboardPage.expectDashboard();
      });

      await test.step('The API accepts the session while logged in', async () => {
        const response = await sessionApi.client.get('/pim/employees', { limit: 1 });
        expect(response.status, 'API should accept the logged-in session').toBe(200);
      });

      await test.step('Log out', async () => {
        await nav.logout();
        await loginPage.expectLoginPage();
      });

      await test.step('The API rejects the old session', async () => {
        const response = await sessionApi.client.get('/pim/employees', { limit: 1 });
        expect(
          response.status,
          `API should reject the old session after logout (got HTTP ${response.status})`
        ).not.toBe(200);
      });

      await test.step('A protected page redirects to the login screen', async () => {
        await page.goto(ROUTES.employeeList);
        await loginPage.expectLoginPage();
      });
    }
  );
});
