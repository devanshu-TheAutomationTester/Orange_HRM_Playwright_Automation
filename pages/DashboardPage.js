// @ts-check
const { expect } = require('@playwright/test');
const { BasePage } = require('./BasePage');
const { TIMEOUTS, URL_PATTERNS } = require('../config/constants');

class DashboardPage extends BasePage {
  // @param {import('@playwright/test').Page} page
  constructor(page) {
    super(page);
    this.header = page.getByRole('banner').getByRole('heading', { name: 'Dashboard', exact: true });
    // Dashboard widgets are plain cards without a role or accessible name.
    this.widgets = page.locator('.orangehrm-dashboard-widget');
  }

  // The dashboard rendered after a successful login.
  async expectDashboard() {
    await expect(this.page, 'Login should redirect to the dashboard').toHaveURL(URL_PATTERNS.dashboard, {
      timeout: TIMEOUTS.pageReady,
    });
    await expect(this.header, 'Page header should read "Dashboard"').toBeVisible();
    await expect(this.widgets.first(), 'Dashboard widgets should be visible').toBeVisible({
      timeout: TIMEOUTS.pageReady,
    });
  }
}

module.exports = { DashboardPage };
