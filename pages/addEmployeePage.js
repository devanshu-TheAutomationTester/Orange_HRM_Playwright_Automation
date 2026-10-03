const { expect } = require('@playwright/test');
const oxd = require('../utils/oxdHelpers');

// XPath locators - PIM > Add Employee page 
const locators = {
  pageHeader: '//h6[normalize-space()="Add Employee"]',
  firstName: '//input[@name="firstName"]',
  middleName: '//input[@name="middleName"]',
  lastName: '//input[@name="lastName"]',
  employeeId: '//label[normalize-space()="Employee Id"]/../following-sibling::div/input',
  photoInput: '//input[@type="file"]',
  photoPreview: '//img[contains(@class,"employee-image")]',
  saveButton: '//button[@type="submit"]',
};

module.exports = {
  ...locators,

  async waitForForm(page) {
    await expect(page).toHaveURL(/\/pim\/addEmployee/, { timeout: 30_000 });
    await expect(page.locator(locators.pageHeader)).toBeVisible();
    await oxd.waitForPageReady(page);
    // The Employee Id field is pre-filled by the app; let that finish so it doesn't overwrite our value.
    await expect(page.locator(locators.employeeId)).not.toHaveValue('', { timeout: 10_000 }).catch(() => {});
  },

  /**
   * @param {{firstName: string, middleName?: string, lastName: string, employeeId: string, profilePicture?: string}} employee
   */
  async fillForm(page, employee) {
    await page.locator(locators.firstName).fill(employee.firstName);
    if (employee.middleName) await page.locator(locators.middleName).fill(employee.middleName);
    await page.locator(locators.lastName).fill(employee.lastName);
    await page.locator(locators.employeeId).fill(employee.employeeId);
    await expect(page.locator(locators.employeeId), 'Employee Id should contain the test id').toHaveValue(
      employee.employeeId
    );
    if (employee.profilePicture) await this.uploadProfilePicture(page, employee.profilePicture);
  },

  // Uploads a picture through the file input (path relative to the project root).
  async uploadProfilePicture(page, filePath) {
    await page.locator(locators.photoInput).setInputFiles(filePath);
    await expect(
      page.locator(locators.photoPreview),
      'Profile picture preview should show the uploaded image'
    ).toHaveAttribute('src', /^data:image\//);
  },

  // Creates the employee and returns the internal empNumber from the new profile URL. 
  async createEmployee(page, employee) {
    await this.waitForForm(page);
    await this.fillForm(page, employee);
    await page.locator(locators.saveButton).click();
    await oxd.expectToast(page, 'Successfully Saved');
    await expect(page, 'Saving should open the new employee profile').toHaveURL(
      /\/pim\/viewPersonalDetails\/empNumber\/\d+/,
      { timeout: 30_000 }
    );
    return Number(page.url().match(/empNumber\/(\d+)/)[1]);
  },
};
