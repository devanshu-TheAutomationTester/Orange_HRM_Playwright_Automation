// @ts-check
const { expect } = require('@playwright/test');
const { BasePage } = require('./BasePage');
const { MESSAGES, ROUTES, TIMEOUTS, URL_PATTERNS } = require('../config/constants');

/** PIM > Employee List **/
class EmployeeListPage extends BasePage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    super(page);
    this.employeeIdFilter = this.oxd.textbox('Employee Id');
    this.searchButton = page.getByRole('button', { name: 'Search', exact: true });
    // Scoped to the table header area: "No Records Found" is also shown as an info toast.
    this.recordCount = page
      .locator('.orangehrm-horizontal-padding')
      .getByText(/^\s*(\(\d+\) Records? Found|No Records Found)\s*$/);
    this.columnHeaders = page.getByRole('columnheader');
    this.confirmDeleteButton = page.getByRole('button', { name: 'Yes, Delete' });
  }

  async open() {
    await this.goto(ROUTES.employeeList);
  }

  /** Table row of an employee (the header row never contains an Employee Id). @param {string} employeeId **/
  row(employeeId) {
    return this.page.getByRole('row').filter({ hasText: employeeId });
  }

  /**
   * Searches by Employee Id.
   * The page first loads ALL employees; we wait for that to finish, otherwise the slow full
   * list can arrive after our search result and replace it. Then we wait for the search response.
   * @param {string} employeeId
   */
  async searchByEmployeeId(employeeId) {
    await expect(this.page).toHaveURL(URL_PATTERNS.employeeList, { timeout: TIMEOUTS.pageReady });
    await expect(this.recordCount.first(), 'Employee List should finish loading').toBeVisible({
      timeout: TIMEOUTS.slowList,
    });
    await this.oxd.waitForPageReady();

    await this.employeeIdFilter.fill(employeeId);
    const searchResponse = this.page.waitForResponse(
      (res) => res.url().includes('/api/v2/pim/employees?') && res.request().method() === 'GET',
      { timeout: TIMEOUTS.slowList }
    );
    await this.searchButton.click();
    await searchResponse;
    await this.oxd.waitForPageReady();
  }

  /** @param {string} employeeId */
  async expectSingleResult(employeeId) {
    await expect(this.row(employeeId), `Exactly one row should be listed for Employee Id "${employeeId}"`).toHaveCount(
      1
    );
    await expect(this.recordCount, 'Record count should be 1').toHaveText(MESSAGES.oneRecord);
  }

  /** @param {string} employeeId */
  async expectNoRecords(employeeId) {
    await expect(this.recordCount, 'Search should return no records').toHaveText(MESSAGES.noRecords);
    await expect(this.row(employeeId), `No row should remain for Employee Id "${employeeId}"`).toHaveCount(0);
  }

  /**
   * Reads the row as { 'Id': ..., 'Last Name': ..., 'Job Title': ..., ... } by pairing cells with header text.
   * @param {string} employeeId
   * @returns {Promise<Record<string, string>>}
   */
  async getRowData(employeeId) {
    const headers = (await this.columnHeaders.allInnerTexts()).map((h) => h.trim());
    const cells = (await this.row(employeeId).getByRole('cell').allInnerTexts()).map((c) => c.trim());
    return headers.reduce((rowData, header, i) => {
      if (header) rowData[header] = cells[i] ?? '';
      return rowData;
    }, /** @type {Record<string, string>} */ ({}));
  }

  /** Opens the profile by clicking the Id cell. @param {string} employeeId */
  async openEmployee(employeeId) {
    await this.row(employeeId).getByRole('cell', { name: employeeId, exact: true }).click();
    await expect(this.page).toHaveURL(URL_PATTERNS.personalDetails, { timeout: TIMEOUTS.pageReady });
    await this.oxd.waitForPageReady();
  }

  /** @param {string} employeeId */
  async deleteEmployee(employeeId) {
    // The row's action buttons are icon-only (no accessible name); the trash icon identifies "delete".
    await this.row(employeeId)
      .getByRole('button')
      .filter({ has: this.page.locator('.bi-trash') })
      .click();
    await this.confirmDeleteButton.click();
    await this.oxd.expectToast(MESSAGES.deleted);
    await this.oxd.waitForPageReady();
  }
}

module.exports = { EmployeeListPage };
