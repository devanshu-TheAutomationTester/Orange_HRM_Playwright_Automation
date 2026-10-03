const { test } = require('@playwright/test');

const loginPage = require('../pages/loginPage');
const dashboardPage = require('../pages/dashboardPage');
const headerPage = require('../pages/headerPage');

test.describe('Authentication', { tag: '@smoke' }, () => {
  test('Verify login succeeds with valid credentials and logout returns to the login page', async ({ page }) => {
    await loginPage.login(page);
    await dashboardPage.expectDashboard(page);
    await headerPage.logout(page);
    await loginPage.expectLoginPage(page);
  });

  test('Verify login is rejected with invalid credentials', async ({ page }) => {
    await loginPage.login(page, process.env.ORANGEHRM_USERNAME, 'wrong-password-123');
    await loginPage.expectInvalidCredentialsError(page);
  });
});
