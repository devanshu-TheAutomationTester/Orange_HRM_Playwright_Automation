const { expect } = require('@playwright/test');

// XPath locators - Login page 
const locators = {
  username: '//input[@name="username"]',
  password: '//input[@name="password"]',
  loginButton: '//button[@type="submit"]',
  loginTitle: '//h5[normalize-space()="Login"]',
  errorAlert: '//*[contains(@class,"oxd-alert-content-text")]',
};

module.exports = {
  ...locators,

  async open(page) {
    await page.goto('auth/login');
    await expect(page.locator(locators.username)).toBeVisible({ timeout: 30_000 });
  },

  // Logs in. Credentials default to .env (ORANGEHRM_USERNAME / ORANGEHRM_PASSWORD). 
  async login(page, username = process.env.ORANGEHRM_USERNAME, password = process.env.ORANGEHRM_PASSWORD) {
    if (!username || !password) {
      throw new Error('Missing credentials: set ORANGEHRM_USERNAME and ORANGEHRM_PASSWORD in .env');
    }
    await this.open(page);
    await page.locator(locators.username).fill(username);
    await page.locator(locators.password).fill(password);
    await page.locator(locators.loginButton).click();
  },

  async expectInvalidCredentialsError(page) {
    await expect(page.locator(locators.errorAlert), 'An "Invalid credentials" error should be shown').toHaveText(
      'Invalid credentials'
    );
    await expect(page).toHaveURL(/\/auth\/login/);
  },

  // Asserts the login screen is displayed (after logout or when the session is gone).
  async expectLoginPage(page) {
    await expect(page, 'User should be on the login page').toHaveURL(/\/auth\/login/, { timeout: 30_000 });
    await expect(page.locator(locators.loginTitle), 'Login form title should be visible').toBeVisible();
    await expect(page.locator(locators.username)).toBeVisible();
  },
};
