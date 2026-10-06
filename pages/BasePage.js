// @ts-check
const { OxdComponents } = require('./components/OxdComponents');

/**
 * Common base for page objects- holds the Playwright page and the shared OXD widget helpers.
 * Page objects are created per test by fixtures (fixtures/index.js) - specs never call `new`.
 */
class BasePage {
  // @param {import('@playwright/test').Page} page 
  constructor(page) {
    this.page = page;
    this.oxd = new OxdComponents(page);
  }

  /** Navigates to a route relative to baseURL (see ROUTES) and waits for loaders. @param {string} route */
  async goto(route) {
    await this.page.goto(route);
    await this.oxd.waitForPageReady();
  }
}

module.exports = { BasePage };
