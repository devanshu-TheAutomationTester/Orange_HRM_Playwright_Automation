// @ts-check
const { expect } = require('@playwright/test');
const { BasePage } = require('./BasePage');
const { MESSAGES, TIMEOUTS, URL_PATTERNS } = require('../config/constants');

// PIM > Add Employee //
class AddEmployeePage extends BasePage {
  // @param {import('@playwright/test').Page} page 
  constructor(page) {
    super(page);
    this.heading = page.getByRole('heading', { name: 'Add Employee', exact: true });
    this.form = page.locator('form');
    this.firstName = page.getByPlaceholder('First Name');
    this.middleName = page.getByPlaceholder('Middle Name');
    this.lastName = page.getByPlaceholder('Last Name');
    this.employeeId = this.oxd.textbox('Employee Id');
    // The real <input type=file> is hidden behind a styled button; setInputFiles needs the input itself.
    this.photoInput = this.form.locator('input[type="file"]');
    this.photoPreview = this.form.getByRole('img', { name: 'profile picture' });
    this.saveButton = this.form.getByRole('button', { name: 'Save', exact: true });
  }

  async waitForForm() {
    await expect(this.page).toHaveURL(URL_PATTERNS.addEmployee, { timeout: TIMEOUTS.pageReady });
    await expect(this.heading).toBeVisible();
    await this.oxd.waitForPageReady();
  }

  
  async fillEmployeeId(employeeId) {
    await expect(async () => {
      await this.employeeId.fill(employeeId);
      await expect(this.employeeId).toHaveValue(employeeId, { timeout: TIMEOUTS.fieldSettle });
    }, 'Employee Id field should keep the test id').toPass({ timeout: TIMEOUTS.pageReady });
  }

  
  async fillForm(employee) {
    await this.firstName.fill(employee.firstName);
    if (employee.middleName) await this.middleName.fill(employee.middleName);
    await this.lastName.fill(employee.lastName);
    await this.fillEmployeeId(employee.employeeId);
    if (employee.profilePicturePath) await this.uploadProfilePicture(employee.profilePicturePath);
  }

  // @param {string} filePath absolute path 
  async uploadProfilePicture(filePath) {
    await this.photoInput.setInputFiles(filePath);
    await expect(this.photoPreview, 'Profile picture preview should show the uploaded image').toHaveAttribute(
      'src',
      /^data:image\//
    );
  }

 
  async createEmployee(employee) {
    await this.waitForForm();
    await this.fillForm(employee);
    await this.saveButton.click();
    await this.oxd.expectToast(MESSAGES.saved);
    await expect(this.page, 'Saving should open the new employee profile').toHaveURL(URL_PATTERNS.personalDetails, {
      timeout: TIMEOUTS.pageReady,
    });
    const match = this.page.url().match(URL_PATTERNS.personalDetails);
    if (!match) throw new Error(`Could not read empNumber from ${this.page.url()}`);
    return Number(match[1]);
  }
}

module.exports = { AddEmployeePage };
