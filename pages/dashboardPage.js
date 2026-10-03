const { expect } = require('@playwright/test');

// XPath locators - Dashboard page 
const locators = {
  dashboardHeader: '//h6[normalize-space()="Dashboard"]',
  widget: '//div[contains(@class,"orangehrm-dashboard-widget")]',
};

module.exports = {
  ...locators,

  // Verifies the dashboard rendered after a successful login. 
  async expectDashboard(page) {
    await expect(page, 'Login should redirect to the dashboard').toHaveURL(/\/dashboard\/index/, { timeout: 30_000 });
    await expect(page.locator(locators.dashboardHeader), 'Page header should read "Dashboard"').toBeVisible();
    await expect(page.locator(locators.widget).first(), 'Dashboard widgets should be visible').toBeVisible({
      timeout: 30_000,
    });
  },
};
