// @ts-check
const { test, expect } = require('../../fixtures');
const { ROUTES, TAGS } = require('../../config/constants');
const { employeeRows } = require('../../utils/testData');

// Data-driven: one describe per row of test-data/employees.json (EMPLOYEE_KEY=<key> runs a single row).
for (const row of employeeRows()) {
  test.describe(`PIM - create employee [${row.key}]`, { tag: [TAGS.regression, TAGS.ui] }, () => {
    test.use({ employeeRow: row });

    test(
      'Admin creates an employee with a profile picture',
      { tag: [TAGS.p1] },
      async ({ employeeData, employeeCleanup, nav, addEmployeePage, employeeDetailsPage, apiClient }) => {
        // Created through the UI, so register it for teardown before anything can fail.
        employeeCleanup.track(employeeData.employeeId);

        await test.step('Open PIM > Add Employee from the menu', async () => {
          await nav.goto(ROUTES.dashboard);
          await nav.openPim();
          await nav.openAddEmployee();
        });

        const empNumber = await test.step('Save the employee with a profile picture', async () => {
          const created = await addEmployeePage.createEmployee(employeeData);
          await employeeDetailsPage.expectEmployeeName(employeeData);
          await employeeDetailsPage.expectProfilePicture();
          return created;
        });

        await test.step('The API returns the new employee', async () => {
          const response = await apiClient.employees.search(employeeData.employeeId);
          expect(response.status).toBe(200);
          expect(response.body).toMatchSchema('employeeList');

          const matches = response.body.data.filter(
            (/** @type {{ employeeId: string }} */ e) => e.employeeId === employeeData.employeeId
          );
          expect(matches, `API should return exactly one employee "${employeeData.employeeId}"`).toHaveLength(1);
          expect(matches[0]).toMatchObject({
            empNumber,
            firstName: employeeData.firstName,
            lastName: employeeData.lastName,
          });
        });
      }
    );
  });
}
