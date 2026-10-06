// @ts-check
const { expect } = require('@playwright/test');
const { BasePage } = require('./BasePage');
const { MESSAGES, ROUTES, TIMEOUTS, URL_PATTERNS } = require('../config/constants');

class LoginPage extends BasePage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    super(page);
    this.title = page.getByRole('heading', { name: 'Login', exact: true });
    this.username = page.getByPlaceholder('Username');
    this.password = page.getByPlaceholder('Password');
    this.loginButton = page.getByRole('button', { name: 'Login', exact: true });
    this.invalidCredentialsError = page.getByText(MESSAGES.invalidCredentials, { exact: true });
  }

  async open() {
    await this.page.goto(ROUTES.login);
    await expect(this.username).toBeVisible({ timeout: TIMEOUTS.pageReady });
  }

  /**
   * Logs in through the UI.
   * @param {{ username: string, password: string }} credentials
   **/
  async login({ username, password }) {
    await this.open();
    await this.username.fill(username);
    await this.password.fill(password);
    await this.loginButton.click();
  }

  async expectInvalidCredentialsError() {
    await expect(this.invalidCredentialsError, 'An "Invalid credentials" error should be shown').toBeVisible();
    await expect(this.page).toHaveURL(URL_PATTERNS.login);
  }

  /** The login screen is displayed (after logout or when the session is gone). **/
  async expectLoginPage() {
    await expect(this.page, 'User should be on the login page').toHaveURL(URL_PATTERNS.login, {
      timeout: TIMEOUTS.pageReady,
    });
    await expect(this.title, 'Login form title should be visible').toBeVisible();
    await expect(this.username).toBeVisible();
  }
}

module.exports = { LoginPage };
