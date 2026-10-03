const { expect } = require('@playwright/test');
const oxd = require('../utils/oxdHelpers');

// XPath locators - side menu, top navigation and user menu (shared by all pages) 
const locators = {
  pimMenu: '//a[contains(@href,"/pim/viewPimModule")]',
  pimHeader: '//h6[normalize-space()="PIM"]',
  addEmployeeTab: '//a[normalize-space()="Add Employee"]',
  employeeListTab: '//a[normalize-space()="Employee List"]',
  userDropdown: '//span[contains(@class,"oxd-userdropdown-tab")]',
  logoutLink: '//a[normalize-space()="Logout"]',
};

module.exports = {
  ...locators,

  // Opens PIM from the left side menu. 
  async openPim(page) {
    await page.locator(locators.pimMenu).click();
    await expect(page.locator(locators.pimHeader), 'PIM module should open').toBeVisible({ timeout: 30_000 });
    await oxd.waitForPageReady(page);
  },

  async openAddEmployee(page) {
    await page.locator(locators.addEmployeeTab).click();
    await oxd.waitForPageReady(page);
  },

  async openEmployeeList(page) {
    await page.locator(locators.employeeListTab).click();
    await oxd.waitForPageReady(page);
  },

  async logout(page) {
    await page.locator(locators.userDropdown).click();
    await page.locator(locators.logoutLink).click();
  },
};
