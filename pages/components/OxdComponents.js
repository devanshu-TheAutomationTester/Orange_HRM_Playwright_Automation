// @ts-check
const { expect } = require('@playwright/test');
const { TIMEOUTS } = require('../../config/constants');

/** @param {string} text */
const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** @param {string} text exact-match, whitespace-tolerant pattern */
const exactText = (text) => new RegExp(`^\\s*${escapeRegExp(text)}\\s*$`);

/**
 * Helpers for OrangeHRM's "OXD" widget library, shared by every page object.
 *
 * Locator policy: prefer user-facing locators (getByRole / getByPlaceholder / getByText).
 * OrangeHRM's <label> elements are not linked to their inputs (no `for`/`id`), so getByLabel()
 * cannot find them; `field(label)` instead scopes to the input group that contains the visible
 * label text and then uses a role locator inside it. CSS classes are only used where the widget
 * exposes no role or accessible name (loaders, toasts, the custom select box).
 */
class OxdComponents {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
    this.formLoader = page.locator('.oxd-form-loader');
    this.spinner = page.locator('.oxd-loading-spinner');
    this.toastContainer = page.locator('.oxd-toast');
  }

  /**
   * The input group (label + control) whose label reads exactly `label`.
   * @param {string} label e.g. "Employee Id"
   */
  field(label) {
    return this.page.locator('.oxd-input-group').filter({
      has: this.page.locator('label').filter({ hasText: exactText(label) }),
    });
  }

  /** Text box inside the labelled group. @param {string} label */
  textbox(label) {
    return this.field(label).getByRole('textbox');
  }

  /** The clickable box of an OXD select (it has no ARIA role). @param {string} label */
  select(label) {
    return this.field(label).locator('.oxd-select-text-input');
  }

  /**
   * Opens the OXD select and picks the option with exactly this text.
   * @param {string} label   e.g. "Job Title"
   * @param {string} optionText e.g. "QA Engineer"
   */
  async selectOption(label, optionText) {
    const select = this.select(label);
    await select.click();
    await this.page.getByRole('listbox').getByRole('option', { name: optionText, exact: true }).click();
    await expect(select, `"${label}" should show "${optionText}"`).toHaveText(optionText);
  }

  /** Waits until visible loaders/spinners are gone (hidden ones may stay in the DOM). */
  async waitForPageReady() {
    await expect(this.formLoader.filter({ visible: true })).toHaveCount(0, { timeout: TIMEOUTS.pageReady });
    await expect(this.spinner.filter({ visible: true })).toHaveCount(0, { timeout: TIMEOUTS.pageReady });
  }

  /** Asserts a toast with this message is shown. @param {string} message */
  async expectToast(message) {
    await expect(
      this.toastContainer.getByText(message, { exact: true }).first(),
      `Toast "${message}" should be displayed`
    ).toBeVisible();
  }
}

module.exports = { OxdComponents, exactText, escapeRegExp };
