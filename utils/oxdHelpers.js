const { expect } = require('@playwright/test');

/** Shared XPath locators for OrangeHRM's common widgets (used on every screen). */
const locators = {
  formLoader: '//div[contains(@class,"oxd-form-loader")]',
  spinner: '//div[contains(@class,"oxd-loading-spinner")]',
  toast: '//div[contains(@class,"oxd-toast")]',
  dropdownOption: '//div[@role="listbox"]//div[@role="option"]',
};

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Helper functions for toasts, loaders and dropdowns - shared by every page module. 
module.exports = {
  ...locators,

  /** Waits until loaders are gone so the screen is ready to use. */
  async waitForPageReady(page) {
    // Only visible loaders count - hidden ones may stay in the page.
    await expect(page.locator(locators.formLoader).filter({ visible: true })).toHaveCount(0, { timeout: 30_000 });
    await expect(page.locator(locators.spinner).filter({ visible: true })).toHaveCount(0, { timeout: 30_000 });
  },

  // Asserts a toast message (e.g. "Successfully Saved") is shown. 
  async expectToast(page, message) {
    await expect(
      page.locator(locators.toast).filter({ hasText: message }).first(),
      `Toast "${message}" should be displayed`
    ).toBeVisible();
  },

  /**
   * Opens a dropdown and selects an option by its text.
   * @param {import('@playwright/test').Page} page
   * @param {string} dropdownXPath the XPath of the dropdown box to click
   * @param {string} optionText e.g. "QA Engineer"
   */
  async selectDropdownOption(page, dropdownXPath, optionText) {
    const dropdown = page.locator(dropdownXPath);
    await dropdown.click();
    await page
      .locator(locators.dropdownOption)
      .filter({ hasText: new RegExp(`^${escapeRegExp(optionText)}$`) })
      .click();
    await expect(dropdown, `Dropdown should show "${optionText}"`).toHaveText(optionText);
  },
};
