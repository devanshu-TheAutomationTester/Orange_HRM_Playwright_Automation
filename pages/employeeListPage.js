const { expect } = require('@playwright/test');
const oxd = require('../utils/oxdHelpers');

// XPath locators - PIM > Employee List page 
const locators = {
  employeeIdFilter: '//label[normalize-space()="Employee Id"]/../following-sibling::div/input',
  searchButton: '//button[normalize-space()="Search"]',
  recordCount: '//div[contains(@class,"orangehrm-horizontal-padding")]/span',
  tableHeaderCell: '//div[@role="columnheader"]',
  tableRow: '//div[contains(@class,"oxd-table-card")]',
  // Relative to a table row:
  rowCell: 'xpath=.//div[@role="cell"]',
  rowDeleteButton: 'xpath=.//i[contains(@class,"bi-trash")]/parent::button',
  confirmDeleteButton: '//button[normalize-space()="Yes, Delete"]',
};

module.exports = {
  ...locators,

  /** The table row of an employee: fixed row XPath, filtered by the Employee Id text. */
  row(page, employeeId) {
    return page.locator(locators.tableRow).filter({ hasText: employeeId });
  },

  /**
   * Searches by Employee Id.
   * The page first loads ALL employees; we wait for that to finish, otherwise the slow full
   * list can arrive after our search result and replace it. Then we wait for the search response.
   */
  async searchByEmployeeId(page, employeeId) {
    await expect(page).toHaveURL(/\/pim\/viewEmployeeList/, { timeout: 30_000 });
    await expect(
      page.locator(locators.recordCount).filter({ hasText: /Records? Found/ }).first(),
      'Employee List should finish loading'
    ).toBeVisible({ timeout: 60_000 });
    await oxd.waitForPageReady(page);

    await page.locator(locators.employeeIdFilter).fill(employeeId);
    const searchResponse = page.waitForResponse(
      (res) => res.url().includes('/api/v2/pim/employees?') && res.request().method() === 'GET',
      { timeout: 60_000 }
    );
    await page.locator(locators.searchButton).click();
    await searchResponse;
    await oxd.waitForPageReady(page);
  },

  async expectSingleResult(page, employeeId) {
    await expect(
      this.row(page, employeeId),
      `Exactly one row should be listed for Employee Id "${employeeId}"`
    ).toHaveCount(1);
    await expect(
      page.locator(locators.recordCount).filter({ hasText: /^\(1\) Record Found$/ }),
      'Record count should be 1'
    ).toBeVisible();
  },

  async expectNoRecords(page, employeeId) {
    await expect(
      page.locator(locators.recordCount).filter({ hasText: /^No Records Found$/ }),
      'Search should return no records'
    ).toBeVisible();
    await expect(this.row(page, employeeId), `No row should remain for Employee Id "${employeeId}"`).toHaveCount(0);
  },

  /**
   * Reads the employee's row as { 'Id': ..., 'Last Name': ..., 'Job Title': ..., ... }
   * by pairing each cell with its column header text.
   */
  async getRowData(page, employeeId) {
    const headers = (await page.locator(locators.tableHeaderCell).allInnerTexts()).map((h) => h.trim());
    const cells = (await this.row(page, employeeId).locator(locators.rowCell).allInnerTexts()).map((c) => c.trim());
    return headers.reduce((rowData, header, i) => {
      if (header) rowData[header] = cells[i] ?? '';
      return rowData;
    }, {});
  },

  /** Opens the employee profile by clicking the Id cell of its row. */
  async openEmployee(page, employeeId) {
    await this.row(page, employeeId).locator(locators.rowCell).filter({ hasText: employeeId }).click();
    await expect(page).toHaveURL(/\/pim\/viewPersonalDetails\/empNumber\/\d+/, { timeout: 30_000 });
    await oxd.waitForPageReady(page);
  },

  async deleteEmployee(page, employeeId) {
    await this.row(page, employeeId).locator(locators.rowDeleteButton).click();
    await page.locator(locators.confirmDeleteButton).click();
    await oxd.expectToast(page, 'Successfully Deleted');
    await oxd.waitForPageReady(page);
  },
};
