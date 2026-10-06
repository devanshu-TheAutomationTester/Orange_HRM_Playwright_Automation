// @ts-check
const { expect } = require('@playwright/test');
const { BasePage } = require('./BasePage');
const { MESSAGES, ROUTES, TIMEOUTS, URL_PATTERNS } = require('../config/constants');

// Employee profile: name header, profile picture and the Job tab.
class EmployeeDetailsPage extends BasePage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    super(page);
    this.employeeName = page.locator('.orangehrm-edit-employee-name').getByRole('heading');
    this.profileImage = page.locator('img.employee-image');
    this.jobTab = page.getByRole('tablist').getByRole('link', { name: 'Job', exact: true });
    this.jobDetailsHeading = page.getByRole('heading', { name: 'Job Details', exact: true });
    this.jobForm = page.locator('form').filter({ has: this.oxd.field('Employment Status') });
    this.jobSaveButton = this.jobForm.getByRole('button', { name: 'Save', exact: true });
  }

  /** @param {{ firstName: string, lastName: string }} employee */
  async expectEmployeeName({ firstName, lastName }) {
    await expect(this.employeeName, 'Profile header should show the employee name').toHaveText(
      `${firstName} ${lastName}`,
      { timeout: TIMEOUTS.pageReady }
    );
  }

  async expectProfilePicture() {
    await expect(this.profileImage, 'Profile picture should be displayed').toBeVisible();
    await expect(this.profileImage, 'Profile picture should be the uploaded photo').toHaveAttribute(
      'src',
      /viewPhoto\/empNumber\/\d+/
    );
  }

  /** Opens the Job tab directly. @param {number} empNumber */
  async openJobDetails(empNumber) {
    await this.page.goto(ROUTES.jobDetails(empNumber));
    await this.waitForJobDetails();
  }

  /** Opens the Job tab from an open profile. */
  async openJobTab() {
    await this.jobTab.click();
    await this.waitForJobDetails();
  }

  async waitForJobDetails() {
    await expect(this.page).toHaveURL(URL_PATTERNS.jobDetails, { timeout: TIMEOUTS.pageReady });
    await expect(this.jobDetailsHeading).toBeVisible({ timeout: TIMEOUTS.pageReady });
    await this.oxd.waitForPageReady();
  }

  /** @param {{ jobTitle: string, employmentStatus: string }} job */
  async updateJobDetails({ jobTitle, employmentStatus }) {
    await this.oxd.selectOption('Job Title', jobTitle);
    await this.oxd.selectOption('Employment Status', employmentStatus);
    await this.jobSaveButton.click();
    await this.oxd.expectToast(MESSAGES.updated);
    await this.oxd.waitForPageReady();
  }

  // Reloads the Job tab and asserts the saved values are shown. @param {{ jobTitle: string, employmentStatus: string }} job
  async expectPersistedJobDetails({ jobTitle, employmentStatus }) {
    await this.page.reload();
    await this.waitForJobDetails();
    await expect(this.oxd.select('Job Title'), 'Job Title should be saved after reload').toHaveText(jobTitle);
    await expect(this.oxd.select('Employment Status'), 'Employment Status should be saved after reload').toHaveText(
      employmentStatus
    );
  }
}

module.exports = { EmployeeDetailsPage };
