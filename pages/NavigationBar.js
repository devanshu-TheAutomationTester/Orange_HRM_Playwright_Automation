// @ts-check
const { expect } = require('@playwright/test');
const { BasePage } = require('./BasePage');
const { MENU, MESSAGES, TIMEOUTS } = require('../config/constants');

/** Side menu, PIM top bar, user menu and the access-denied alert - shared by every screen. **/
class NavigationBar extends BasePage {
  /** @param {import('@playwright/test').Page} page **/
  constructor(page) {
    super(page);
    this.sidePanel = page.getByRole('navigation', { name: 'Sidepanel' });
    this.topbar = page.getByRole('navigation', { name: 'Topbar Menu' });
    this.banner = page.getByRole('banner');
    this.userMenu = this.banner.getByRole('listitem').filter({ has: page.getByAltText('profile picture') });
    this.logoutItem = page.getByRole('menuitem', { name: 'Logout' });
    this.credentialRequired = page.getByText(MESSAGES.credentialRequired, { exact: true });
  }

  /** Side-menu link by its visible name, e.g. "PIM". @param {string} name **/
  menuItem(name) {
    return this.sidePanel.getByRole('link', { name, exact: true });
  }

  /** Module title shown in the top banner, e.g. "PIM". @param {string} name **/
  moduleHeader(name) {
    return this.banner.getByRole('heading', { name, exact: true });
  }

  async openPim() {
    await this.menuItem(MENU.pim).click();
    await expect(this.moduleHeader(MENU.pim), 'PIM module should open').toBeVisible({ timeout: TIMEOUTS.pageReady });
    await this.oxd.waitForPageReady();
  }

  async openAddEmployee() {
    await this.topbar.getByRole('link', { name: 'Add Employee', exact: true }).click();
    await this.oxd.waitForPageReady();
  }

  async openEmployeeList() {
    await this.topbar.getByRole('link', { name: 'Employee List', exact: true }).click();
    await this.oxd.waitForPageReady();
  }

  async logout() {
    await this.userMenu.click();
    await this.logoutItem.click();
  }

  /** @param {string[]} names */
  async expectMenuItemsVisible(names) {
    for (const name of names) {
      await expect(this.menuItem(name), `Side menu should offer "${name}"`).toBeVisible();
    }
  }

  /** @param {string[]} names */
  async expectMenuItemsHidden(names) {
    for (const name of names) {
      await expect(this.menuItem(name), `Side menu should NOT offer "${name}"`).toHaveCount(0);
    }
  }

  /** OrangeHRM's access-denied page for a role without permission. **/
  async expectAccessDenied() {
    await expect(this.credentialRequired, `"${MESSAGES.credentialRequired}" should be shown`).toBeVisible({
      timeout: TIMEOUTS.pageReady,
    });
  }
}

module.exports = { NavigationBar };
