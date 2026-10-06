// @ts-check
const { test, expect, LOGGED_OUT } = require('../../fixtures');
const { OrangeHrmApi } = require('../../api');
const { MENU, ROUTES, TAGS } = require('../../config/constants');

test.describe('Role-based access', { tag: [TAGS.regression, TAGS.rbac] }, () => {
  test.describe('Admin user', () => {
    // Positive control: proves the menus checked below really exist for a privileged role.
    test('Admin sees the PIM and Admin modules', { tag: [TAGS.p2] }, async ({ nav }) => {
      await nav.goto(ROUTES.dashboard);
      await nav.expectMenuItemsVisible([MENU.admin, MENU.pim, MENU.myInfo]);
    });
  });

  test.describe('ESS user', () => {
    // Every test gets its own ESS user (created through the API by the essUser fixture and
    // deleted in teardown) and logs in with it through the UI in a fresh browser context.
    test.use({ storageState: LOGGED_OUT });

    test.beforeEach(async ({ essUser, loginPage, dashboardPage }) => {
      await loginPage.login(essUser);
      await dashboardPage.expectDashboard();
    });

    test('ESS user only sees self-service modules in the menu', { tag: [TAGS.ui, TAGS.p1] }, async ({ nav }) => {
      await nav.expectMenuItemsVisible([MENU.dashboard, MENU.myInfo]);
      await nav.expectMenuItemsHidden([MENU.admin, MENU.pim]);
    });

    const protectedPages = [
      { name: 'Admin > User Management', route: ROUTES.systemUsers },
      { name: 'PIM > Employee List', route: ROUTES.employeeList },
    ];
    for (const { name, route } of protectedPages) {
      test(`ESS user is denied ${name} when opening it by URL`, { tag: [TAGS.ui, TAGS.p1] }, async ({ page, nav }) => {
        await page.goto(route);
        await nav.expectAccessDenied();
      });
    }

    test(
      'ESS user cannot read admin data or delete employees through the API',
      { tag: [TAGS.api, TAGS.p1] },
      async ({ page, employee, apiClient, logger }) => {
        // Requests made with the ESS user's own browser session.
        const essApi = OrangeHrmApi.forPage(page, logger);

        await test.step('Admin > Users API is refused', async () => {
          const response = await essApi.admin.listUsers();
          expect(response.status, 'ESS user should get HTTP 403 from /admin/users').toBe(403);
        });

        await test.step('Another employee is not visible through the PIM API', async () => {
          const response = await essApi.employees.search(employee.employeeId);
          const visible = (response.body?.data ?? []).filter(
            (/** @type {{ employeeId: string }} */ e) => e.employeeId === employee.employeeId
          );
          expect(visible, 'ESS user should not see other employees').toHaveLength(0);
        });

        await test.step('Deleting another employee is refused and the employee still exists', async () => {
          const response = await essApi.employees.delete([employee.empNumber]);
          expect(response.ok, `ESS delete should be refused (got HTTP ${response.status})`).toBe(false);

          const stillThere = await apiClient.employees.findByEmployeeId(employee.employeeId);
          expect(stillThere, 'Employee should still exist after the refused delete').toHaveLength(1);
        });
      }
    );
  });
});
