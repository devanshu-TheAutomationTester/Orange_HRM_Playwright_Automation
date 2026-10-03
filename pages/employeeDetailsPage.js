const { expect } = require('@playwright/test');
const oxd = require('../utils/oxdHelpers');

// XPath locators - Employee profile (Personal Details header + Job tab) 
const locators = {
  employeeName: '//div[contains(@class,"orangehrm-edit-employee-name")]/h6',
  profileImage: '//img[contains(@class,"employee-image")]',
  jobTab: '//a[normalize-space()="Job"]',
  jobDetailsHeader: '//h6[normalize-space()="Job Details"]',
  jobTitleDropdown:
    '//label[normalize-space()="Job Title"]/../following-sibling::div//div[contains(@class,"oxd-select-text-input")]',
  employmentStatusDropdown:
    '//label[normalize-space()="Employment Status"]/../following-sibling::div//div[contains(@class,"oxd-select-text-input")]',
  jobSaveButton: '//h6[normalize-space()="Job Details"]/following::button[@type="submit"][1]',
};

module.exports = {
  ...locators,

  async expectEmployeeProfile(page, { firstName, lastName }) {
    await expect(page.locator(locators.employeeName), 'Profile header should show the employee name').toHaveText(
      `${firstName} ${lastName}`,
      { timeout: 30_000 }
    );
    await expect(page.locator(locators.profileImage), 'Profile picture should be displayed').toBeVisible();
  },

  async openJobTab(page) {
    await page.locator(locators.jobTab).click();
    await expect(page).toHaveURL(/\/pim\/viewJobDetails\/empNumber\/\d+/, { timeout: 30_000 });
    await expect(page.locator(locators.jobDetailsHeader)).toBeVisible();
    await oxd.waitForPageReady(page);
  },

  // Updates Job Title and Employment Status and saves. 
  async updateJobDetails(page, { jobTitle, employmentStatus }) {
    await oxd.selectDropdownOption(page, locators.jobTitleDropdown, jobTitle);
    await oxd.selectDropdownOption(page, locators.employmentStatusDropdown, employmentStatus);
    await page.locator(locators.jobSaveButton).click();
    await oxd.expectToast(page, 'Successfully Updated');
    await oxd.waitForPageReady(page);
  },

  // Reloads the Job tab and asserts the saved values are shown. 
  async expectPersistedJobDetails(page, { jobTitle, employmentStatus }) {
    await page.reload();
    await expect(page.locator(locators.jobDetailsHeader)).toBeVisible({ timeout: 30_000 });
    await oxd.waitForPageReady(page);
    await expect(page.locator(locators.jobTitleDropdown), 'Job Title should be saved after reload').toHaveText(
      jobTitle
    );
    await expect(
      page.locator(locators.employmentStatusDropdown),
      'Employment Status should be saved after reload'
    ).toHaveText(employmentStatus);
  },
};
